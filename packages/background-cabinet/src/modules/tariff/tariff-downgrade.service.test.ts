/**
 * Зубы понижения freeze-first (#2587 b4; ADR-0031, решение 5). Порча P4: на стволе 68e6abb0
 * сервиса нет — импорт падает, зуб красный.
 *
 * Всё подменено прибором наблюдения: не «вызвали», а В КАКОМ ПОРЯДКЕ и С ЧЕМ. Несущие
 * утверждения: порядок preview неподтверждённых → freeze подтверждённых → setTariff → sync; отказ
 * media → setTariff 0 вызовов; избыток без подтверждённого хеша — preview_required с предпросмотром;
 * в приказ уходит ПОКАЗАННЫЙ хеш, протухший судит media (plan_stale) — разбор Веснина п.2–п.4;
 * повтор того же запроса идемпотентен.
 */
import { describe, expect, it, vi } from 'vitest';

import { TariffDowngradeService } from './tariff-downgrade.service';

vi.mock('../../domain/tariff-grid-source', () => ({
  loadTariffGrid: () => ({
    rows: [
      { sku: 'free-v1', rank: 0 },
      { sku: 'checkpoint-v1', rank: 1 },
      { sku: 'observatory-v1', rank: 2 },
    ],
  }),
}));
vi.mock('../../domain/tariff-transition', () => ({
  rankOf: (grid: { rows: { sku: string; rank: number }[] }, sku: string) => grid.rows.find((r) => r.sku === sku)?.rank,
}));

const NOW = new Date('2026-10-06T12:00:00Z');
const DAY = 86_400_000;

function planFor(deviceId: string, freezeCount: number) {
  return {
    ok: true as const,
    criterion: 'loudness-over-floor' as const,
    bufferLimitBytes: 512,
    activeBufferBytes: 512 + freezeCount * 100,
    keep: [{ sampleId: `${deviceId}-k`, title: 'k', bytes: 512, createdAt: NOW.toISOString(), pinned: false, modeRank: 0 }],
    freeze: Array.from({ length: freezeCount }, (_, i) => ({ sampleId: `${deviceId}-f${i}`, title: 'f', bytes: 100, createdAt: NOW.toISOString(), pinned: false, modeRank: i + 1 })),
    keepBytes: 512,
    freezeBytes: freezeCount * 100,
    measured: 1 + freezeCount,
    unmeasured: 0,
    failedTail: { sampleIds: [], bytes: 0 },
    planDigest: `digest-${deviceId}`,
    measuredMs: 5,
  };
}

function ack(deviceId: string, over: Partial<{ idempotent: boolean }> = {}) {
  return {
    ok: true as const,
    idempotent: over.idempotent ?? false,
    batch: { batchId: `batch-${deviceId}`, state: 'frozen', frozenAt: NOW.toISOString(), expiresAt: new Date(NOW.getTime() + 14 * DAY).toISOString(), frozenBytes: 100, keptBytes: 512, sampleCount: 1 },
    adopted: 0,
    activeBufferBytes: 512,
  };
}

function world(over: {
  currentTariff?: string;
  excess?: Record<string, number>;
  freeze?: (deviceId: string) => unknown;
  previewThrows?: string;
  retentionDays?: number;
} = {}) {
  const calls: string[] = [];
  const excess = over.excess ?? { 'md-1': 2, 'md-2': 0 };
  // Актуальный хеш плана на стороне media по прибору. Зуб меняет его между показом и приказом —
  // так моделируется «буфер ожил после предпросмотра» (новая запись / избыток исчез).
  const actualDigest: Record<string, string> = {};
  const digestOf = (deviceId: string) => actualDigest[deviceId] ?? `digest-${deviceId}`;
  const prisma = {
    membrane: { findUnique: vi.fn(async () => ({ id: 'm-1', tariffId: over.currentTariff ?? 'checkpoint-v1' })) },
    tariff: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === 'nope' ? null : { id: where.id, bufferQuotaBytes: 512n })) },
    device: { findMany: vi.fn(async () => Object.keys(excess).map((md, i) => ({ mediaDeviceId: md, nodeId: `n-${i + 1}` }))) },
  };
  const media = {
    preview: vi.fn(async (deviceId: string) => {
      calls.push(`preview ${deviceId}`);
      if (over.previewThrows === deviceId) throw new Error('ECONNREFUSED');
      return { ...planFor(deviceId, excess[deviceId] ?? 0), planDigest: digestOf(deviceId) };
    }),
    // Стаб судит хеш, как настоящий сервер записей (downgrade-archive.service.ts freeze:
    // пересчёт плана и сравнение хеша): чужой/протухший planDigest → plan_stale, партии нет.
    freeze: vi.fn(async (deviceId: string, order: { planDigest: string }) => {
      calls.push(`freeze ${deviceId}`);
      if (over.freeze) return over.freeze(deviceId);
      if (order.planDigest !== digestOf(deviceId)) return { ok: false, reason: 'plan_stale', detail: 'состав буфера или лимит изменились после предпросмотра' };
      return ack(deviceId);
    }),
  };
  const retention = { daysFor: vi.fn(async () => over.retentionDays ?? 14) };
  const policy = { read: vi.fn(async () => ({ membraneId: 'm-1', criterion: 'loudness-over-floor', isDefault: true, updatedAt: null })) };
  const transition = {
    selectTariff: vi.fn(async ({ toTariffId }: { toTariffId: string }) => {
      calls.push('setTariff');
      return { ok: true as const, fromTariffId: 'checkpoint-v1', toTariffId };
    }),
  };
  const fanout = { syncAllNodes: vi.fn(async () => { calls.push('sync'); return { updated: 2, failed: 0 }; }) };
  const svc = new TariffDowngradeService(prisma as never, media as never, retention as never, policy as never, transition as never, fanout as never);
  return { svc, calls, prisma, media, retention, policy, transition, fanout, actualDigest, excess };
}

const nodesByMd = (p: { nodes: readonly { mediaDeviceId: string; planDigest: string; nodeId: string }[] }) =>
  Object.fromEntries(p.nodes.map((n) => [n.mediaDeviceId, n]));

describe('preview — по всем узлам мембраны, ничего не меняет', () => {
  it('понижение с избытком на одном из двух узлов: по узлам keep/freeze/байты/хеш, requiresConfirmation, срок из reader', async () => {
    const { svc, media, transition, fanout } = world();
    const p = await svc.preview('m-1', 'free-v1', NOW);
    expect(p.ok && p.downgrade).toBe(true);
    if (!p.ok || !p.downgrade) return;
    expect(p.fromTariffId).toBe('checkpoint-v1');
    expect(p.criterion).toBe('loudness-over-floor');
    expect(p.retentionDays).toBe(14);
    expect(p.expiresAtEstimate).toBe(new Date(NOW.getTime() + 14 * DAY).toISOString());
    expect(p.bufferLimitBytes).toBe(512);
    expect(p.requiresConfirmation).toBe(true);
    const byMd = nodesByMd(p);
    expect(byMd['md-1']).toMatchObject({ nodeId: 'n-1', keepCount: 1, keepBytes: 512, freezeCount: 2, freezeBytes: 200, planDigest: 'digest-md-1', excess: true });
    expect(byMd['md-2']).toMatchObject({ nodeId: 'n-2', freezeCount: 0, excess: false });
    expect(media.preview).toHaveBeenCalledWith('md-1', { criterion: 'loudness-over-floor', bufferLimitBytes: 512 });
    expect(media.freeze).not.toHaveBeenCalled();
    expect(transition.selectTariff).not.toHaveBeenCalled();
    expect(fanout.syncAllNodes).not.toHaveBeenCalled();
  });

  it('повышение — downgrade:false без обращения к media; тот же тариф — same_tariff; неизвестный — unknown_target_tariff', async () => {
    const { svc, media } = world({ currentTariff: 'free-v1' });
    expect(await svc.preview('m-1', 'checkpoint-v1', NOW)).toEqual({ ok: true, downgrade: false, fromTariffId: 'free-v1', toTariffId: 'checkpoint-v1' });
    expect(media.preview).not.toHaveBeenCalled();
    expect(await svc.preview('m-1', 'free-v1', NOW)).toEqual({ ok: false, reason: 'same_tariff' });
    expect(await svc.preview('m-1', 'nope', NOW)).toEqual({ ok: false, reason: 'unknown_target_tariff' });
  });

  it('media не отвечает на предпросмотр — media_unavailable с узлом в detail', async () => {
    const { svc } = world({ previewThrows: 'md-2' });
    const p = await svc.preview('m-1', 'free-v1', NOW);
    expect(p).toMatchObject({ ok: false, reason: 'media_unavailable' });
    expect(p.ok === false && p.detail).toContain('n-2');
  });
});

describe('select — порядок freeze-first', () => {
  it('ПОРЯДОК: preview только неподтверждённых узлов → freeze подтверждённых → setTariff → sync; ответ несёт frozen с batchId и expiresAt', async () => {
    const { svc, calls, media, transition } = world();
    const p = await svc.preview('m-1', 'free-v1', NOW);
    if (!p.ok || !p.downgrade) throw new Error('нет плана');
    calls.length = 0;

    const out = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: { 'n-1': 'digest-md-1' }, now: NOW });
    // Подтверждённый md-1 НЕ пересчитывается (его хеш судит media); md-2 без подтверждения —
    // единственная проверка кабинета «нет ли там избытка».
    expect(calls).toEqual(['preview md-2', 'freeze md-1', 'setTariff', 'sync']);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out).toMatchObject({ fromTariffId: 'checkpoint-v1', toTariffId: 'free-v1', contextSync: { updated: 2, failed: 0 } });
    expect(out.frozen).toEqual([{ nodeId: 'n-1', mediaDeviceId: 'md-1', batchId: 'batch-md-1', frozenBytes: 100, expiresAt: new Date(NOW.getTime() + 14 * DAY).toISOString(), idempotent: false }]);
    expect(media.freeze).toHaveBeenCalledWith('md-1', { criterion: 'loudness-over-floor', bufferLimitBytes: 512, planDigest: 'digest-md-1', retentionDays: 14, membraneId: 'm-1', fromTariffId: 'checkpoint-v1', toTariffId: 'free-v1' });
    expect(transition.selectTariff).toHaveBeenCalledWith({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', now: NOW });
  });

  it('узел с избытком не подтверждён (хешей нет / подтверждён не тот узел) — preview_required с полным предпросмотром; freeze и setTariff — 0 вызовов', async () => {
    const { svc, media, transition } = world();
    for (const digests of [undefined, { 'n-2': 'digest-md-2' }]) {
      const out = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: digests, now: NOW });
      expect(out.ok).toBe(false);
      if (out.ok || out.reason !== 'preview_required') throw new Error(`ожидали preview_required, получили ${JSON.stringify(out)}`);
      expect(out.preview.requiresConfirmation).toBe(true);
      expect(out.preview.nodes).toHaveLength(2);
      expect(nodesByMd(out.preview)['md-1']?.planDigest).toBe('digest-md-1');
    }
    expect(media.freeze).not.toHaveBeenCalled();
    expect(transition.selectTariff).not.toHaveBeenCalled();
  });

  it('ПОРЧА п.2 Веснина: подтверждён ПОКАЗАННЫЙ хеш, актуальный в media уже другой → в media уходит показанный, media отвечает plan_stale → тариф не коммитится (setTariff 0)', async () => {
    const { svc, calls, media, transition, fanout, actualDigest } = world();
    const shown = await svc.preview('m-1', 'free-v1', NOW);
    if (!shown.ok || !shown.downgrade) throw new Error('нет плана');
    const shownDigest = nodesByMd(shown)['md-1']!.planDigest;
    expect(shownDigest).toBe('digest-md-1');
    // Между показом и подтверждением буфер md-1 ожил: актуальный хеш в media сменился.
    actualDigest['md-1'] = 'digest-md-1-after-new-record';
    calls.length = 0;

    const out = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: { 'n-1': shownDigest }, now: NOW });
    expect(out).toEqual({
      ok: false,
      reason: 'freeze_failed',
      frozen: [],
      failures: [{ nodeId: 'n-1', mediaDeviceId: 'md-1', reason: 'plan_stale', detail: 'состав буфера или лимит изменились после предпросмотра', batchId: null }],
    });
    // Кабинет НЕ пересчитывает предпросмотр подтверждённого md-1 и не подменяет хеш свежим:
    // в приказ ушёл ровно показанный человеку 'digest-md-1'.
    expect(calls).toEqual(['preview md-2', 'freeze md-1']);
    expect(media.freeze).toHaveBeenCalledTimes(1);
    expect(media.freeze.mock.calls[0]?.[1]).toMatchObject({ planDigest: 'digest-md-1' });
    expect(transition.selectTariff).toHaveBeenCalledTimes(0);
    expect(fanout.syncAllNodes).toHaveBeenCalledTimes(0);
  });

  it('п.4 Веснина: у подтверждённого узла избыток исчез между показом и приказом — судит media (plan_stale), новой причины в кабинете нет; setTariff 0', async () => {
    const { svc, transition, actualDigest, excess } = world();
    // Пользователь удалил пробы — избытка на md-1 больше нет, план (и его хеш) у media другой.
    excess['md-1'] = 0;
    actualDigest['md-1'] = 'digest-md-1-no-excess';
    const out = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: { 'n-1': 'digest-md-1' }, now: NOW });
    expect(out).toMatchObject({ ok: false, reason: 'freeze_failed', failures: [{ nodeId: 'n-1', reason: 'plan_stale', batchId: null }] });
    expect(transition.selectTariff).toHaveBeenCalledTimes(0);

    // Повтор БЕЗ хеша по свежему предпросмотру: избытка нет нигде — обычный путь, тариф коммитится.
    const again = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', now: NOW });
    expect(again).toMatchObject({ ok: true, toTariffId: 'free-v1' });
    expect(transition.selectTariff).toHaveBeenCalledTimes(1);
  });

  it('безобидное изменение на неподтверждённом узле (новая запись, избытка нет) НЕ даёт preview_required — подтверждение сходится само с собой', async () => {
    const { svc, media, transition } = world();
    let n = 0;
    media.preview.mockImplementation(async (deviceId: string) => {
      n += 1;
      // md-2 меняет хеш на каждом вызове (состав буфера живёт), избытка по-прежнему нет.
      return { ...planFor(deviceId, deviceId === 'md-1' ? 2 : 0), planDigest: deviceId === 'md-2' ? `digest-md-2-${n}` : 'digest-md-1' };
    });
    const out = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: { 'n-1': 'digest-md-1' }, now: NOW });
    expect(out.ok).toBe(true);
    expect(transition.selectTariff).toHaveBeenCalledTimes(1);
  });

  it('media отказала в заморозке (quota_invariant_violated, партия failed) → freeze_failed с batchId; setTariff 0 вызовов, sync 0', async () => {
    const { svc, calls, transition, fanout } = world({
      excess: { 'md-1': 1, 'md-2': 1 },
      freeze: (deviceId) => deviceId === 'md-1'
        ? { ok: false, reason: 'quota_invariant_violated', detail: 'живых 600 > лимита 512', batch: { batchId: 'batch-failed-1', state: 'failed' } }
        : ack(deviceId),
    });
    const out = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: { 'n-1': 'digest-md-1', 'n-2': 'digest-md-2' }, now: NOW });
    expect(out).toEqual({ ok: false, reason: 'freeze_failed', frozen: [], failures: [{ nodeId: 'n-1', mediaDeviceId: 'md-1', reason: 'quota_invariant_violated', detail: 'живых 600 > лимита 512', batchId: 'batch-failed-1' }] });
    expect(transition.selectTariff).toHaveBeenCalledTimes(0);
    expect(fanout.syncAllNodes).toHaveBeenCalledTimes(0);
    // Первый сбой останавливает цепочку: второй узел не морозится под тариф, который не сменится.
    expect(calls.filter((c) => c.startsWith('freeze'))).toEqual(['freeze md-1']);
  });

  it('media недоступна на заморозке второго узла — freeze_failed: первый узел назван во frozen, setTariff 0 вызовов', async () => {
    const { svc, transition } = world({
      excess: { 'md-1': 1, 'md-2': 1 },
      freeze: (deviceId) => { if (deviceId === 'md-2') throw new Error('ECONNRESET'); return ack(deviceId); },
    });
    const out = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: { 'n-1': 'digest-md-1', 'n-2': 'digest-md-2' }, now: NOW });
    expect(out.ok).toBe(false);
    if (out.ok || out.reason !== 'freeze_failed') throw new Error('ожидали freeze_failed');
    expect(out.frozen.map((f) => f.batchId)).toEqual(['batch-md-1']);
    expect(out.failures[0]).toMatchObject({ nodeId: 'n-2', reason: 'media_unavailable', batchId: null });
    expect(transition.selectTariff).not.toHaveBeenCalled();
  });

  it('ИДЕМПОТЕНТНОСТЬ: повтор того же запроса после обрыва между заморозкой и commit — media отдаёт ту же партию (idempotent), тариф коммитится один раз', async () => {
    let attempt = 0;
    const { svc, transition, media } = world({
      excess: { 'md-1': 1, 'md-2': 0 },
      freeze: (deviceId) => ack(deviceId, { idempotent: attempt > 0 }),
    });
    transition.selectTariff.mockImplementationOnce(async () => { throw new Error('connection lost'); });
    const digests = { 'n-1': 'digest-md-1' };
    await expect(svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: digests, now: NOW })).rejects.toThrow('connection lost');
    attempt += 1;
    const retry = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: digests, now: NOW });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.frozen).toEqual([expect.objectContaining({ batchId: 'batch-md-1', idempotent: true })]);
    expect(media.freeze).toHaveBeenCalledTimes(2);
    expect(transition.selectTariff).toHaveBeenCalledTimes(2);
  });

  it('избытка нет (понижение помещается) или повышение — обычный путь: setTariff → sync без заморозки и без frozen в ответе', async () => {
    const fits = world({ excess: { 'md-1': 0, 'md-2': 0 } });
    const out = await fits.svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', now: NOW });
    expect(out).toEqual({ ok: true, fromTariffId: 'checkpoint-v1', toTariffId: 'free-v1', contextSync: { updated: 2, failed: 0 } });
    expect(fits.media.freeze).not.toHaveBeenCalled();
    expect(fits.calls).toEqual(['preview md-1', 'preview md-2', 'setTariff', 'sync']);

    const up = world({ currentTariff: 'free-v1' });
    const outUp = await up.svc.select({ membraneId: 'm-1', toTariffId: 'checkpoint-v1', actorId: 'u-1', now: NOW });
    expect(outUp.ok).toBe(true);
    expect(up.calls).toEqual(['setTariff', 'sync']);
  });

  it('отказ перехода после заморозки (гонка на тарифе) — причина домена + frozen, разноски нет', async () => {
    const { svc, transition, fanout } = world({ excess: { 'md-1': 1, 'md-2': 0 } });
    transition.selectTariff.mockImplementationOnce(async () => ({ ok: false as const, reason: 'tariff_moved_concurrently' as const }));
    const out = await svc.select({ membraneId: 'm-1', toTariffId: 'free-v1', actorId: 'u-1', previewDigests: { 'n-1': 'digest-md-1' }, now: NOW });
    expect(out).toMatchObject({ ok: false, reason: 'tariff_moved_concurrently' });
    expect(out.ok === false && 'frozen' in out && out.frozen?.map((f) => f.batchId)).toEqual(['batch-md-1']);
    expect(fanout.syncAllNodes).not.toHaveBeenCalled();
  });
});
