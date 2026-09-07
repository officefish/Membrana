/**
 * Зубы origin-сервиса политики переполнения (#2308, блок B `overflow-policy`).
 *
 * Предмет — `MembraneBufferPolicyService`: гейт при записи, разноска после записи со счётом,
 * подтверждение привязки, отказ per-device при стоящей галочке. Порчи: `smart_cleanup` без
 * параметров записан → красный; разноска до записи → красный; галочка включена без
 * подтверждения → красный; правка прибора при стоящей галочке прошла → красный.
 *
 * #2318 (гейт до T12): `smart_cleanup` даже с ПОЛНЫМ набором → `smart_cleanup_unavailable`, ни
 * записи, ни разноски (порча: снять гейт → красный); неполный набор → причина ГЕЙТА, не
 * `params_incomplete`, и раньше проверки галочки (порча порядка → красный); строка мембраны с
 * умной очисткой → вид `stop` + РОВНО один warn на мембрану (порча: снять fail-closed → красный).
 */
import { ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetSmartCleanupGateWarningsForTests } from './buffer-policy-gate-warn';
import { MembraneBufferPolicyService } from './membrane-buffer-policy.service';

afterEach(() => {
  vi.restoreAllMocks();
  resetSmartCleanupGateWarningsForTests();
});

const FULL_PARAMS = { thresholdPercent: 90, selection: 'oldest_first', protectLabeled: true };

function make(over: { binding?: boolean; node?: unknown } = {}) {
  const order: string[] = [];
  const prisma = {
    membraneBufferPolicy: {
      upsert: vi.fn(async () => {
        order.push('write');
        return { binding: over.binding ?? false, id: 'm-1' };
      }),
      findUnique: vi.fn(async () =>
        over.binding === undefined ? null : { membraneId: 'm-1', mode: 'stop', params: null, binding: over.binding },
      ),
    },
    node: {
      findUnique: vi.fn(async () =>
        'node' in over
          ? over.node
          : {
              id: 'n-1',
              membrane: { id: 'm-1', userId: 'u-1' },
              device: { id: 'd-1', mediaDeviceId: 'md-1' },
            },
      ),
    },
    device: {
      update: vi.fn(async () => {
        order.push('write');
        return { id: 'd-1' };
      }),
    },
  };
  const fanout = {
    syncAllNodes: vi.fn(async () => {
      order.push('fanout');
      return { updated: 2, failed: 1 };
    }),
    syncNode: vi.fn(async () => {
      order.push('fanout');
      return { updated: 1, failed: 0 };
    }),
  };
  const svc = new MembraneBufferPolicyService(prisma as never, fanout as never);
  return { svc, prisma, fanout, order };
}

describe('политика мембраны', () => {
  it('stop пишется и разносится по всем; счёт уезжает наружу как есть', async () => {
    const { svc, prisma, fanout } = make();
    const res = await svc.setMembranePolicy('m-1', { mode: 'stop' });
    expect(res).toEqual({
      ok: true,
      bufferPolicy: { mode: 'stop', params: null },
      applyToAll: false,
      contextSync: { updated: 2, failed: 1 },
    });
    expect(prisma.membraneBufferPolicy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { membraneId: 'm-1' }, update: expect.objectContaining({ mode: 'stop' }) }),
    );
    expect(fanout.syncAllNodes).toHaveBeenCalledWith('m-1');
  });

  it('#2318: smart_cleanup с ПОЛНЫМ набором → ok:false, smart_cleanup_unavailable; ничего не записано, разноски нет (порча: снять гейт → красный)', async () => {
    const { svc, prisma, fanout } = make();
    const res = await svc.setMembranePolicy('m-1', { mode: 'smart_cleanup', params: FULL_PARAMS });
    expect(res).toEqual({ ok: false, reason: 'smart_cleanup_unavailable' });
    expect(prisma.membraneBufferPolicy.upsert).not.toHaveBeenCalled();
    expect(fanout.syncAllNodes).not.toHaveBeenCalled();
  });

  it('smart_cleanup БЕЗ параметров → ok:false — причина ГЕЙТА, не params_incomplete (#2318, порча порядка → красный); ничего не записано, разноски нет', async () => {
    const { svc, prisma, fanout } = make();
    const res = await svc.setMembranePolicy('m-1', { mode: 'smart_cleanup', params: { thresholdPercent: 90 } });
    expect(res).toEqual({ ok: false, reason: 'smart_cleanup_unavailable' });
    expect(prisma.membraneBufferPolicy.upsert).not.toHaveBeenCalled();
    expect(fanout.syncAllNodes).not.toHaveBeenCalled();
  });

  it('легаси auto-cleanup → unknown_mode', async () => {
    const { svc } = make();
    await expect(svc.setMembranePolicy('m-1', { mode: 'auto-cleanup' })).resolves.toEqual({
      ok: false,
      reason: 'unknown_mode',
    });
  });

  it('порядок несущий: сначала запись, потом приборы', async () => {
    const { svc, order } = make();
    await svc.setMembranePolicy('m-1', { mode: 'stop' });
    expect(order).toEqual(['write', 'fanout']);
  });

  it('разноска идёт и при снятой галочке — правило без исключений', async () => {
    const { svc, fanout } = make({ binding: false });
    await svc.setMembranePolicy('m-1', { mode: 'stop' });
    expect(fanout.syncAllNodes).toHaveBeenCalledTimes(1);
  });
});

describe('галочка-привязка', () => {
  it('включение без подтверждения → binding_not_confirmed, запись не тронута (порча: включить → красный)', async () => {
    const { svc, prisma, fanout } = make();
    await expect(svc.setBinding('m-1', { applyToAll: true })).resolves.toEqual({
      ok: false,
      reason: 'binding_not_confirmed',
    });
    await expect(svc.setBinding('m-1', { applyToAll: true, confirmed: 'yes' })).resolves.toEqual({
      ok: false,
      reason: 'binding_not_confirmed',
    });
    expect(prisma.membraneBufferPolicy.upsert).not.toHaveBeenCalled();
    expect(fanout.syncAllNodes).not.toHaveBeenCalled();
  });

  it('включение с подтверждением → записано, разнесено по всем', async () => {
    const { svc, prisma, order } = make();
    const res = await svc.setBinding('m-1', { applyToAll: true, confirmed: true });
    expect(res).toEqual({ ok: true, applyToAll: true, contextSync: { updated: 2, failed: 1 } });
    expect(prisma.membraneBufferPolicy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { binding: true } }),
    );
    expect(order).toEqual(['write', 'fanout']);
  });

  it('снятие — без подтверждения, и тоже с разноской (приборам возвращаются их настройки)', async () => {
    const { svc, prisma, fanout } = make();
    const res = await svc.setBinding('m-1', { applyToAll: false });
    expect(res).toMatchObject({ ok: true, applyToAll: false });
    expect(prisma.membraneBufferPolicy.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { binding: false } }),
    );
    expect(fanout.syncAllNodes).toHaveBeenCalledTimes(1);
  });

  it('applyToAll не-булев читается как «снять», а не как «включить»', async () => {
    const { svc } = make();
    await expect(svc.setBinding('m-1', { applyToAll: 'true' })).resolves.toMatchObject({ ok: true, applyToAll: false });
  });
});

describe('политика прибора', () => {
  it('галочка снята → записано в прибор, разнесено на ОДИН узел', async () => {
    const { svc, prisma, fanout } = make({ binding: false });
    const res = await svc.setNodePolicy('u-1', 'n-1', { mode: 'stop' });
    expect(res).toEqual({
      ok: true,
      nodeId: 'n-1',
      bufferPolicy: { mode: 'stop', params: null },
      effectiveBufferPolicy: { mode: 'stop', params: null },
      contextSync: { updated: 1, failed: 0 },
    });
    expect(prisma.device.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nodeId: 'n-1' }, data: expect.objectContaining({ bufferPolicy: 'stop' }) }),
    );
    expect(fanout.syncNode).toHaveBeenCalledWith('m-1', 'n-1');
    expect(fanout.syncAllNodes).not.toHaveBeenCalled();
  });

  it('галочка стоит → binding_active, прибор не тронут (порча: записать → красный)', async () => {
    const { svc, prisma, fanout } = make({ binding: true });
    await expect(svc.setNodePolicy('u-1', 'n-1', { mode: 'stop' })).resolves.toEqual({
      ok: false,
      reason: 'binding_active',
    });
    expect(prisma.device.update).not.toHaveBeenCalled();
    expect(fanout.syncNode).not.toHaveBeenCalled();
  });

  it('форма отбивается РАНЬШЕ проверки галочки — и #2318: причина гейта, не params_incomplete (порча порядка → красный)', async () => {
    const { svc, prisma, fanout } = make({ binding: true });
    await expect(svc.setNodePolicy('u-1', 'n-1', { mode: 'smart_cleanup' })).resolves.toEqual({
      ok: false,
      reason: 'smart_cleanup_unavailable',
    });
    await expect(svc.setNodePolicy('u-1', 'n-1', { mode: 'smart_cleanup', params: FULL_PARAMS })).resolves.toEqual({
      ok: false,
      reason: 'smart_cleanup_unavailable',
    });
    expect(prisma.device.update).not.toHaveBeenCalled();
    expect(fanout.syncNode).not.toHaveBeenCalled();
  });

  it('узел без прибора → node_not_paired', async () => {
    const { svc } = make({
      node: { id: 'n-1', membrane: { id: 'm-1', userId: 'u-1' }, device: null },
    });
    await expect(svc.setNodePolicy('u-1', 'n-1', { mode: 'stop' })).resolves.toEqual({
      ok: false,
      reason: 'node_not_paired',
    });
  });

  it('чужой узел → 403; несуществующий → 404 (транспорт, не домен)', async () => {
    const foreign = make({
      node: { id: 'n-1', membrane: { id: 'm-1', userId: 'someone-else' }, device: null },
    });
    await expect(foreign.svc.setNodePolicy('u-1', 'n-1', { mode: 'stop' })).rejects.toBeInstanceOf(ForbiddenException);
    const missing = make({ node: null });
    await expect(missing.svc.setNodePolicy('u-1', 'n-x', { mode: 'stop' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('вид мембраны', () => {
  it('порченая строка мембраны показывается как stop, привязка — только при true', () => {
    expect(MembraneBufferPolicyService.membraneView({ mode: 'garbage', binding: true })).toEqual({
      mode: 'stop',
      params: null,
      applyToAll: true,
    });
    expect(MembraneBufferPolicyService.membraneView(null)).toEqual({ mode: 'stop', params: null, applyToAll: false });
  });

  it('#2318 fail-closed: строка мембраны с умной очисткой и полным S → вид stop; warn с id мембраны — РОВНО один на мембрану (порча: снять fail-closed → красный)', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const setting = { membraneId: 'm-7', mode: 'smart_cleanup', params: FULL_PARAMS, binding: true };
    expect(MembraneBufferPolicyService.membraneView(setting)).toEqual({ mode: 'stop', params: null, applyToAll: true });
    MembraneBufferPolicyService.membraneView(setting);
    MembraneBufferPolicyService.membraneView(setting);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0]![0]);
    expect(message).toContain('m-7');
    expect(message).toMatch(/#2318/u);
    // Другая мембрана — свой warn: дедупликация по субъекту, не глобальная.
    MembraneBufferPolicyService.membraneView({ ...setting, membraneId: 'm-8' });
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
