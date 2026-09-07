/**
 * Зубы разноски контекста мембраны по приборам (#2281).
 *
 * Главное, что здесь проверяется, — ЧАСТИЧНЫЙ УСПЕХ как законный исход и правдивость счёта.
 * Мост в media подменён вручную: важно не «вызвали», а СКОЛЬКО и С ЧЕМ ушло.
 */
import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetSmartCleanupGateWarningsForTests } from '../membrane/buffer-policy-gate-warn';
import { MembraneContextFanoutService } from './membrane-context-fanout.service';

afterEach(() => {
  vi.restoreAllMocks();
  resetSmartCleanupGateWarningsForTests();
});

const TARIFF = {
  userStorageQuotaBytes: 9_007_199_254_740_993n,
  bufferQuotaBytes: 512n,
  datasetCatalogId: 'catalog-checkpoint',
  maxUserWorkspaces: 7,
};

type DeviceRow = { mediaDeviceId: string; nodeId: string; bufferPolicy?: unknown; bufferPolicyParams?: unknown };

function make(over: { membrane?: unknown; setting?: unknown; devices?: DeviceRow[] } = {}) {
  const devices = over.devices ?? [
    { mediaDeviceId: 'md-1', nodeId: 'n-1' },
    { mediaDeviceId: 'md-2', nodeId: 'n-2' },
  ];
  const prisma = {
    membrane: {
      findUnique: vi.fn(async () =>
        'membrane' in over ? over.membrane : { id: 'm-1', tariffId: 'checkpoint-v1', tariff: TARIFF },
      ),
    },
    membraneBufferPolicy: { findUnique: vi.fn(async () => over.setting ?? null) },
    device: {
      findMany: vi.fn(async (args?: { where?: { nodeId?: string } }) =>
        args?.where?.nodeId ? devices.filter((d) => d.nodeId === args.where!.nodeId) : devices,
      ),
    },
  };
  const bridge = { syncMembraneContext: vi.fn(async () => undefined) };
  const svc = new MembraneContextFanoutService(prisma as never, bridge as never);
  return { svc, prisma, bridge, devices };
}

const SMART_PARAMS = { thresholdPercent: 85, selection: 'oldest_first', protectLabeled: true };
const SMART_SETTING = { membraneId: 'm-1', mode: 'smart_cleanup', params: SMART_PARAMS };

/** Что уехало политикой на данный прибор. */
function sentPolicy(bridge: { syncMembraneContext: ReturnType<typeof vi.fn> }, mediaDeviceId: string) {
  const call = bridge.syncMembraneContext.mock.calls.find((c) => c[0] === mediaDeviceId);
  return (call?.[1] as { bufferPolicy?: unknown } | undefined)?.bufferPolicy;
}

describe('разноска политики переполнения (#2308) — тем же классом, что квоты', () => {
  // Семантика привязки (кто чью строку слушает) доказана на чистом слое `buffer-policy.test.ts`
  // с опцией «гейт снят». Здесь, сквозь живую разноску, — #2318 fail-closed: умная очистка в
  // строке при выключенном гейте до media НЕ доезжает, едет stop, и warn адресован тому, чья
  // строка подменена. Порча: снять fail-closed → в контекст уедет smart_cleanup → красный.
  it('галочка стоит, мембрана хранит умную очистку → КАЖДЫЙ прибор получает stop; warn один — на мембрану', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { svc, bridge } = make({
      setting: { ...SMART_SETTING, binding: true },
      devices: [
        { mediaDeviceId: 'md-1', nodeId: 'n-1', bufferPolicy: 'stop', bufferPolicyParams: null },
        { mediaDeviceId: 'md-2', nodeId: 'n-2' },
      ],
    });
    await expect(svc.syncAllNodes('m-1')).resolves.toEqual({ updated: 2, failed: 0 });
    expect(sentPolicy(bridge, 'md-1')).toEqual({ mode: 'stop', params: null });
    expect(sentPolicy(bridge, 'md-2')).toEqual({ mode: 'stop', params: null });
    const gateWarns = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('#2318'));
    expect(gateWarns).toHaveLength(1);
    expect(gateWarns[0]).toContain('мембрана m-1');
  });

  it('галочка снята, прибор хранит умную очистку → ему едет stop (своя строка, fail-closed); warn — на прибор; stop-прибор без warn', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { svc, bridge } = make({
      setting: { ...SMART_SETTING, binding: false },
      devices: [
        { mediaDeviceId: 'md-1', nodeId: 'n-1', bufferPolicy: 'stop', bufferPolicyParams: null },
        {
          mediaDeviceId: 'md-2',
          nodeId: 'n-2',
          bufferPolicy: 'smart_cleanup',
          bufferPolicyParams: { ...SMART_PARAMS, thresholdPercent: 50 },
        },
      ],
    });
    await svc.syncAllNodes('m-1');
    expect(sentPolicy(bridge, 'md-1')).toEqual({ mode: 'stop', params: null });
    expect(sentPolicy(bridge, 'md-2')).toEqual({ mode: 'stop', params: null });
    const gateWarns = warn.mock.calls.map((c) => String(c[0])).filter((m) => m.includes('#2318'));
    expect(gateWarns).toHaveLength(1);
    expect(gateWarns[0]).toContain('прибор md-2');
    expect(gateWarns[0]).toContain('m-1');
  });

  it('порченая строка прибора при снятой галочке → уезжает stop, не порча', async () => {
    const { svc, bridge } = make({
      setting: { ...SMART_SETTING, binding: false },
      devices: [{ mediaDeviceId: 'md-1', nodeId: 'n-1', bufferPolicy: 'smart_cleanup', bufferPolicyParams: null }],
    });
    await svc.syncAllNodes('m-1');
    expect(sentPolicy(bridge, 'md-1')).toEqual({ mode: 'stop', params: null });
  });

  it('отказ media по гейту параметров считается «не доехало», а не «обновлено»', async () => {
    const { svc, bridge } = make({ setting: { ...SMART_SETTING, binding: true } });
    bridge.syncMembraneContext.mockImplementationOnce(async () => undefined).mockImplementationOnce(async () => {
      throw new Error('Media membrane context sync refused: params_incomplete');
    });
    await expect(svc.syncAllNodes('m-1')).resolves.toEqual({ updated: 1, failed: 1 });
  });

  it('syncNode — разноска на ОДИН прибор при смене его политики: контекст только ему, счёт {1,0}', async () => {
    const { svc, bridge, prisma } = make({
      setting: { ...SMART_SETTING, binding: false },
      devices: [
        { mediaDeviceId: 'md-1', nodeId: 'n-1', bufferPolicy: 'stop' },
        { mediaDeviceId: 'md-2', nodeId: 'n-2', bufferPolicy: 'smart_cleanup', bufferPolicyParams: SMART_PARAMS },
      ],
    });
    await expect(svc.syncNode('m-1', 'n-2')).resolves.toEqual({ updated: 1, failed: 0 });
    expect(bridge.syncMembraneContext).toHaveBeenCalledTimes(1);
    // #2318: своя строка с умной очисткой → stop (fail-closed), контекст всё равно уехал ровно ему.
    expect(sentPolicy(bridge, 'md-2')).toEqual({ mode: 'stop', params: null });
    expect(prisma.device.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { node: { membraneId: 'm-1' }, nodeId: 'n-2' } }),
    );
  });
});

describe('разноска контекста мембраны', () => {
  it('все приборы приняли — счёт «2 обновлено / 0 не удалось»', async () => {
    const { svc, bridge } = make();
    await expect(svc.syncAllNodes('m-1')).resolves.toEqual({ updated: 2, failed: 0 });
    expect(bridge.syncMembraneContext).toHaveBeenCalledTimes(2);
  });

  it('ЧАСТИЧНЫЙ успех — законный исход: один отказ не превращает разноску в провал', async () => {
    const { svc, bridge } = make({
      devices: [
        { mediaDeviceId: 'md-1', nodeId: 'n-1' },
        { mediaDeviceId: 'md-2', nodeId: 'n-2' },
        { mediaDeviceId: 'md-3', nodeId: 'n-3' },
      ],
    });
    bridge.syncMembraneContext.mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async () => {
        throw new Error('Media membrane context sync failed (503): down');
      });

    await expect(svc.syncAllNodes('m-1')).resolves.toEqual({ updated: 2, failed: 1 });
  });

  it('отказ ОДНОГО прибора не отменяет разноску остальным', async () => {
    const { svc, bridge } = make();
    bridge.syncMembraneContext.mockImplementationOnce(async () => {
      throw new Error('down');
    });
    const res = await svc.syncAllNodes('m-1');
    expect(res).toEqual({ updated: 1, failed: 1 });
    expect(bridge.syncMembraneContext).toHaveBeenCalledTimes(2);
  });

  it('ни один не принял — «0 обновлено / 2 не удалось», и это НЕ исключение наружу', async () => {
    // Бросок наружу означал бы «смена не состоялась», а она состоялась и записана в журнал.
    const { svc, bridge } = make();
    bridge.syncMembraneContext.mockRejectedValue(new Error('media dead'));
    await expect(svc.syncAllNodes('m-1')).resolves.toEqual({ updated: 0, failed: 2 });
  });

  it('едут НОВЫЕ числа тарифа, прочитанные из базы, а не принятые сверху', async () => {
    const { svc, bridge } = make();
    await svc.syncAllNodes('m-1');
    expect(bridge.syncMembraneContext).toHaveBeenCalledWith('md-1', {
      membraneId: 'm-1',
      userStorageQuotaBytes: '9007199254740993',
      bufferQuotaBytes: '512',
      datasetCatalogId: 'catalog-checkpoint',
      maxUserWorkspaces: 7,
      // #2308: политика едет тем же контекстом. Строка без поля (старый ряд) → stop.
      bufferPolicy: { mode: 'stop', params: null },
    });
  });

  it('приборов нет — «0 / 0», в media не ходим вовсе', async () => {
    const { svc, bridge } = make({ devices: [] });
    await expect(svc.syncAllNodes('m-1')).resolves.toEqual({ updated: 0, failed: 0 });
    expect(bridge.syncMembraneContext).not.toHaveBeenCalled();
  });

  it('мембраны нет — «0 / 0», а не провал: субъект исчез, разносить нечего', async () => {
    const { svc, prisma, bridge } = make({ membrane: null });
    await expect(svc.syncAllNodes('m-gone')).resolves.toEqual({ updated: 0, failed: 0 });
    expect(prisma.device.findMany).not.toHaveBeenCalled();
    expect(bridge.syncMembraneContext).not.toHaveBeenCalled();
  });

  it('приборы берутся по мембране УЗЛА, а не по чему-то ещё', async () => {
    const { svc, prisma } = make();
    await svc.syncAllNodes('m-1');
    expect(prisma.device.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { node: { membraneId: 'm-1' } } }),
    );
  });
});
