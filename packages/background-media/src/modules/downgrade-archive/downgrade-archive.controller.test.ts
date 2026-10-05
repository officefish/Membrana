/**
 * Зубы контроллера дверей архива понижения (#2587 блок b3): две формы ответа у приказов —
 * 201 сделано / 200 доменный отказ — и передача параметров пути в сервис. Сервис подменён:
 * предмет здесь — статус и форма, не отбор (он в зубах сервиса).
 */
import { describe, expect, it, vi } from 'vitest';

import { DowngradeArchiveController } from './downgrade-archive.controller';

function reply() {
  const r = { status: vi.fn(), send: vi.fn() };
  r.status.mockReturnValue(r);
  r.send.mockImplementation((body: unknown) => body);
  return r;
}

function make(overrides: Partial<Record<'preview' | 'freeze' | 'listBatches' | 'restore', unknown>> = {}) {
  const service = {
    preview: vi.fn(async () => ({ ok: true, planDigest: 'd' })),
    freeze: vi.fn(async () => ({ ok: true, idempotent: false, batch: { batchId: 'b-1' } })),
    listBatches: vi.fn(async () => [{ batchId: 'b-1', state: 'frozen' }]),
    restore: vi.fn(async () => ({ ok: true, batch: { batchId: 'b-1' }, restored: ['s1'] })),
    ...overrides,
  };
  return { controller: new DowngradeArchiveController(service as never), service };
}

const FREEZE_BODY = {
  criterion: 'loudness-over-floor', bufferLimitBytes: '1000', planDigest: 'd', retentionDays: '14',
  membraneId: 'm-1', fromTariffId: 'checkpoint-v1', toTariffId: 'free-v1',
};

describe('DowngradeArchiveController', () => {
  it('preview передаёт deviceId и приводит лимит к числу; ответ — тело сервиса', async () => {
    const { controller, service } = make();
    await expect(controller.preview('dev-1', { criterion: 'drone-likeness', bufferLimitBytes: '512' as never })).resolves.toEqual({ ok: true, planDigest: 'd' });
    expect(service.preview).toHaveBeenCalledWith('dev-1', { criterion: 'drone-likeness', bufferLimitBytes: 512 });
  });

  it('freeze: сделано → 201, тело ack; поля приказа приведены к числам', async () => {
    const { controller, service } = make();
    const r = reply();
    await controller.freeze('dev-1', FREEZE_BODY as never, r as never);
    expect(r.status).toHaveBeenCalledWith(201);
    expect(r.send).toHaveBeenCalledWith(expect.objectContaining({ ok: true, batch: { batchId: 'b-1' } }));
    expect(service.freeze).toHaveBeenCalledWith('dev-1', expect.objectContaining({ bufferLimitBytes: 1000, retentionDays: 14, planDigest: 'd', toTariffId: 'free-v1' }));
  });

  it('freeze: доменный отказ → 200 с reason из словаря, не HTTP-ошибка', async () => {
    const { controller } = make({ freeze: vi.fn(async () => ({ ok: false, reason: 'plan_stale', detail: 'буфер изменился' })) });
    const r = reply();
    await controller.freeze('dev-1', FREEZE_BODY as never, r as never);
    expect(r.status).toHaveBeenCalledWith(200);
    expect(r.send).toHaveBeenCalledWith({ ok: false, reason: 'plan_stale', detail: 'буфер изменился' });
  });

  it('batches — список партий прибора в обёртке', async () => {
    const { controller, service } = make();
    await expect(controller.batches('dev-1')).resolves.toEqual({ batches: [{ batchId: 'b-1', state: 'frozen' }] });
    expect(service.listBatches).toHaveBeenCalledWith('dev-1');
  });

  it('restore: сделано → 201; отказ (insufficient_quota) → 200; deviceId и batchId из пути', async () => {
    const ok = make();
    const r1 = reply();
    await ok.controller.restore('dev-1', 'b-1', r1 as never);
    expect(r1.status).toHaveBeenCalledWith(201);
    expect(ok.service.restore).toHaveBeenCalledWith('dev-1', 'b-1');

    const refused = make({ restore: vi.fn(async () => ({ ok: false, reason: 'insufficient_quota', detail: 'не помещается' })) });
    const r2 = reply();
    await refused.controller.restore('dev-1', 'b-1', r2 as never);
    expect(r2.status).toHaveBeenCalledWith(200);
    expect(r2.send).toHaveBeenCalledWith(expect.objectContaining({ ok: false, reason: 'insufficient_quota' }));
  });
});
