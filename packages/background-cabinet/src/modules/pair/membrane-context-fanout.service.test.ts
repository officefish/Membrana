/**
 * Зубы разноски контекста мембраны по приборам (#2281).
 *
 * Главное, что здесь проверяется, — ЧАСТИЧНЫЙ УСПЕХ как законный исход и правдивость счёта.
 * Мост в media подменён вручную: важно не «вызвали», а СКОЛЬКО и С ЧЕМ ушло.
 */
import { describe, expect, it, vi } from 'vitest';

import { MembraneContextFanoutService } from './membrane-context-fanout.service';

const TARIFF = {
  userStorageQuotaBytes: 9_007_199_254_740_993n,
  bufferQuotaBytes: 512n,
  datasetCatalogId: 'catalog-checkpoint',
  maxUserWorkspaces: 7,
};

function make(over: { membrane?: unknown; devices?: { mediaDeviceId: string; nodeId: string }[] } = {}) {
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
    device: { findMany: vi.fn(async () => devices) },
  };
  const bridge = { syncMembraneContext: vi.fn(async () => undefined) };
  const svc = new MembraneContextFanoutService(prisma as never, bridge as never);
  return { svc, prisma, bridge, devices };
}

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
