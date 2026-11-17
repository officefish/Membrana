/**
 * Зубы дверей архива понижения (#2587 блок b3; ADR-0031). Порча P3 плана: на стволе 1cf33715
 * сервиса и маршрутов нет — импорт падает, зуб красный.
 *
 * НАСТОЯЩИЕ измеритель и отбор (`@membrana/plugin-handlers`), настоящие `DevicesService` и
 * хранилище b2 — поверх таблиц в памяти и синтетических WAV. Проверяется не «вернул объект», а
 * утверждения контракта: громкие остаются по режиму, тихие (неизмеримые) уходят, хеш плана
 * детерминирован, протухший план — отказ, повтор — та же партия, возврат только если помещается.
 * Здесь же замер времени предпросмотра на синтетике (развилка плана про кэш признаков).
 */
import { describe, expect, it, vi } from 'vitest';

import { DevicesService } from '../devices/devices.service';

/**
 * Порча #2629: «измерены все, ранжирована часть». Настоящий `selectChartList` на громких тонах
 * упорядочивает всех, поэтому срез раундов включается рукой только в одном зубе (`cut.firstRound`):
 * первый раунд отдаёт первые N, следующие — пусто. По умолчанию — настоящий отбор без изменений.
 */
const cut = vi.hoisted(() => ({ firstRound: null as number | null, calls: 0 }));
vi.mock('@membrana/plugin-handlers', async (orig) => {
  const real = await orig<typeof import('@membrana/plugin-handlers')>();
  const selectChartList: typeof real.selectChartList = (...args) => {
    const selection = real.selectChartList(...args);
    if (cut.firstRound === null) return selection;
    cut.calls += 1;
    return { ...selection, picks: cut.calls === 1 ? selection.picks.slice(0, cut.firstRound) : [] };
  };
  return { ...real, selectChartList };
});

import { DowngradeArchiveService, modeOrderOf } from './downgrade-archive.service';
import { DowngradeArchiveStore } from './downgrade-archive.store';

const DEV = '00000000-0000-4000-8000-00000000d001';
const OTHER = '00000000-0000-4000-8000-00000000d002';
const NOW = new Date('2026-10-05T12:00:00Z');
const DAY = 86_400_000;
const BUF = '__buffer__';

type Row = Record<string, unknown> & { id: string };

/** Моно wav PCM16: тон `hz` амплитудой `amp` — тот же синтез, что в зубах измерителя. */
function wav(seconds: number, amp: number, hz: number, sr = 48_000): Uint8Array {
  const n = Math.floor(seconds * sr);
  const buf = new ArrayBuffer(44 + n * 2);
  const view = new DataView(buf);
  const ascii = (off: number, s: string) => [...s].forEach((c, i) => view.setUint8(off + i, c.charCodeAt(0)));
  ascii(0, 'RIFF'); view.setUint32(4, 36 + n * 2, true); ascii(8, 'WAVE');
  ascii(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  ascii(36, 'data'); view.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) view.setInt16(44 + i * 2, amp * Math.sin((2 * Math.PI * hz * i) / sr) * 32767, true);
  return new Uint8Array(buf);
}

/** Запись с событием: 0.6 с тихого фона, затем 0.4 с тона — измеритель находит событие в КАЖДОЙ. */
function burstWav(amp: number, hz: number, sr = 48_000): Uint8Array {
  const quiet = wav(0.6, 0.004, 97, sr);
  const loud = wav(0.4, amp, hz, sr);
  const n = (quiet.length - 44) / 2 + (loud.length - 44) / 2;
  const out = new Uint8Array(44 + n * 2);
  out.set(quiet.subarray(0, 44));
  const view = new DataView(out.buffer);
  view.setUint32(4, 36 + n * 2, true);
  view.setUint32(40, n * 2, true);
  out.set(quiet.subarray(44), 44);
  out.set(loud.subarray(44), quiet.length);
  return out;
}

class UniqueViolation extends Error {
  readonly code = 'P2002';
}

function fakeWorld() {
  const sample = new Map<string, Row>();
  const batch = new Map<string, Row>();
  const archived = new Map<string, Row>();
  const blobs = new Map<string, Uint8Array>();
  const device = { bufferQuotaBytes: 0n };
  let seq = 0;

  const matches = (row: Row, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (k === 'batch') return (batch.get(row['batchId'] as string) as Row)['state'] === (v as { state: string }).state;
      if (v !== null && typeof v === 'object' && 'not' in (v as object)) return row[k] !== (v as { not: unknown }).not;
      if (v !== null && typeof v === 'object' && 'in' in (v as object)) return ((v as { in: string[] }).in).includes(row[k] as string);
      if (v !== null && typeof v === 'object' && 'lte' in (v as object)) return (row[k] as Date).getTime() <= ((v as { lte: Date }).lte).getTime();
      return row[k] === v;
    });
  const byId = (rows: Row[]) => rows.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const withCount = (b: Row): Row => ({ ...b, _count: { samples: [...archived.values()].filter((r) => r['batchId'] === b.id).length } });

  const db = {
    batch,
    archived,
    sample: {
      rows: sample,
      findMany: async ({ where }: { where: Record<string, unknown> }) => byId([...sample.values()].filter((r) => matches(r, where))),
      findFirstOrThrow: async ({ where }: { where: Record<string, unknown> }) => {
        const hit = [...sample.values()].find((r) => matches(r, where));
        if (!hit) throw new Error('нет строки');
        return hit;
      },
      createMany: async ({ data }: { data: Row[] }) => {
        for (const d of data) sample.set(d.id, { ...d, collection: { kind: 'buffer', systemKey: null } });
        return { count: data.length };
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const victims = [...sample.values()].filter((r) => matches(r, where));
        for (const v of victims) sample.delete(v.id);
        return { count: victims.length };
      },
    },
    downgradeArchiveBatch: {
      create: async ({ data }: { data: Row }) => {
        for (const b of batch.values()) if (b['deviceId'] === data['deviceId'] && b['planDigest'] === data['planDigest']) throw new UniqueViolation('unique');
        const row = { ...data, id: `batch-${++seq}`, restoredAt: null, deletedAt: null };
        batch.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        if (typeof where['id'] === 'string') return batch.has(where['id']) ? withCount(batch.get(where['id'])!) : null;
        const key = where['deviceId_planDigest'] as { deviceId: string; planDigest: string };
        const hit = [...batch.values()].find((b) => b['deviceId'] === key.deviceId && b['planDigest'] === key.planDigest);
        return hit ? withCount(hit) : null;
      },
      findMany: async ({ where }: { where: Record<string, unknown> }) => [...batch.values()].filter((b) => matches(b, where)).map(withCount),
      update: async ({ where, data }: { where: { id: string }; data: Row }) => {
        const next = { ...batch.get(where.id)!, ...data };
        batch.set(where.id, next);
        return withCount(next);
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
        const hits = [...batch.values()].filter((b) => matches(b, where));
        for (const h of hits) batch.set(h.id, { ...h, ...data });
        return { count: hits.length };
      },
    },
    downgradeArchivedSample: {
      createMany: async ({ data }: { data: Row[] }) => { for (const d of data) archived.set(d.id, { ...d }); return { count: data.length }; },
      findMany: async ({ where }: { where: Record<string, unknown> }) => [...archived.values()].filter((r) => matches(r, where)),
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const victims = [...archived.values()].filter((r) => matches(r, where));
        for (const v of victims) archived.delete(v.id);
        return { count: victims.length };
      },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
        const hits = [...archived.values()].filter((r) => matches(r, where));
        for (const h of hits) archived.set(h.id, { ...h, ...data });
        return { count: hits.length };
      },
    },
    device: {
      findUnique: vi.fn(async () => ({
        id: DEV, membraneId: 'm-1', tariffContractVersion: 1, userStorageQuotaBytes: 10_000_000n,
        bufferQuotaBytes: device.bufferQuotaBytes, datasetCatalogId: 'catalog-free', maxUserWorkspaces: 3, bufferPolicy: 'stop', bufferPolicyParams: null,
      })),
    },
    deviceWorkspace: { count: async () => 0 },
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const snapshot = [sample, batch, archived].map((m) => new Map(m));
      try { return await fn(db); } catch (e) {
        [sample, batch, archived].forEach((m, i) => { m.clear(); for (const [k, v] of snapshot[i]!) m.set(k, v); });
        throw e;
      }
    },
  };

  const addTrack = (id: string, amp: number, hz: number, over: Partial<Row> = {}, deviceId = DEV, bytes = wav(0.5, amp, hz)) => {
    const storageRef = `${deviceId}/${id}.wav`;
    blobs.set(storageRef, bytes);
    sample.set(id, {
      id, deviceId, collectionId: BUF, title: `t-${id}`, class: 'unknown', label: 'unlabeled', source: 'mic_recording',
      durationSec: 0.5, sampleRate: 48_000, channels: 1, audioFormat: 'wav', contentType: 'audio/wav', sizeBytes: bytes.length,
      storageRef, notes: null, createdAt: new Date('2026-10-01T00:00:00Z'), collection: { kind: 'buffer', systemKey: null }, ...over,
    });
    return bytes.length;
  };
  const blobService = { readBuffer: async (ref: string) => Buffer.from(blobs.get(ref)!) };

  const CONFIG = { MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1_000, MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 2_000, MEDIA_DEFAULT_DATASET_CATALOG_ID: 'catalog-free', MEDIA_DEFAULT_MAX_USER_WORKSPACES: 3 } as never;
  const devices = new DevicesService(db as never, CONFIG, {} as never);
  const store = new DowngradeArchiveStore(db as never);
  const service = new DowngradeArchiveService(db as never, blobService as never, devices, store);
  return { db, device, addTrack, devices, store, service };
}

/** Три громких тона (0.9 / 0.6 / 0.3) и два тихих (0.010 / 0.012): тихие ниже порога 12 дБ — неизмеримые. */
function scene() {
  const w = fakeWorld();
  const size = w.addTrack('l-09', 0.9, 440);
  w.addTrack('l-06', 0.6, 660);
  w.addTrack('l-03', 0.3, 880);
  w.addTrack('q-1', 0.01, 300);
  w.addTrack('q-2', 0.012, 500);
  return { ...w, size, limitForTwo: size * 2 };
}

const ids = (rows: readonly { sampleId: string }[]) => rows.map((r) => r.sampleId);

describe('preview — ничего не меняет, режим ранжирует, байты режут', { timeout: 60_000 }, () => {
  it('громче фона: под лимит на две пробы остаются две самые громкие; третья и обе тихие — во freeze', async () => {
    const { service, db, limitForTwo, size } = scene();
    const plan = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(ids(plan.keep)).toEqual(['l-09', 'l-06']);
    expect(ids(plan.freeze)).toEqual(['l-03', 'q-1', 'q-2']);
    expect(plan.keepBytes).toBe(size * 2);
    expect(plan.freezeBytes).toBe(size * 3);
    expect(plan.measured).toBe(3);
    expect(plan.unmeasured).toBe(2);
    expect(plan.freeze[1]?.modeRank).toBeNull();
    expect(plan.activeBufferBytes).toBe(size * 5);
    expect(plan.failedTail).toEqual({ sampleIds: [], bytes: 0 });
    expect(plan.planDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(db.sample.rows.size).toBe(5);
    expect(db.batch.size).toBe(0);
  });

  it('хеш плана детерминирован: два предпросмотра на неизменном буфере дают один planDigest; смена лимита — другой', async () => {
    const { service, limitForTwo } = scene();
    const a = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    const b = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    const c = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo + 1 });
    expect(a.ok && b.ok && c.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok) return;
    expect(a.planDigest).toBe(b.planDigest);
    expect(c.planDigest).not.toBe(a.planDigest);
  });

  it('размеченная проба остаётся первой, даже тихая (pinned побеждает неизмеримость)', async () => {
    const { service, db, size } = scene();
    db.sample.rows.get('q-1')!['label'] = 'drone';
    const plan = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: size * 2 });
    if (!plan.ok) throw new Error(plan.reason);
    expect(ids(plan.keep)).toEqual(['q-1', 'l-09']);
    expect(plan.keep[0]?.pinned).toBe(true);
    expect(plan.keep[0]?.modeRank).toBeNull();
  });

  it('пустой буфер — пустой план без отказа; неизвестный режим и дробный лимит — отказы словаря', async () => {
    const { service } = fakeWorld();
    const empty = await service.preview(DEV, { criterion: 'drone-likeness', bufferLimitBytes: 100 });
    expect(empty.ok).toBe(true);
    if (empty.ok) { expect(empty.keep).toEqual([]); expect(empty.freeze).toEqual([]); expect(empty.measured).toBe(0); }
    expect((await service.preview(DEV, { criterion: 'rare', bufferLimitBytes: 100 })).ok === false && (await service.preview(DEV, { criterion: 'rare', bufferLimitBytes: 100 }) as { reason: string }).reason).toBe('unknown_criterion');
    expect((await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: 1.5 }) as { reason: string }).reason).toBe('invalid_limit');
  });

  it('неизмеримые при свободном бюджете остаются после измеренных, новее — первыми (#2587, прод 07.10)', async () => {
    const { service, db, size } = scene();
    db.sample.rows.get('q-2')!['createdAt'] = new Date('2026-10-02T00:00:00Z');
    const plan = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: size * 4 });
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.unmeasured).toBe(2);
    expect(ids(plan.keep)).toEqual(['l-09', 'l-06', 'l-03', 'q-2']);
    expect(ids(plan.freeze)).toEqual(['q-1']);
    expect(plan.keep[3]?.modeRank).toBeNull();
  });

  it('ПОРЧА #2629: измерены все, ранжирована часть — unmeasured 0, unranked = не упорядоченные; отбор оставляет их под лимитом', async () => {
    const w = fakeWorld();
    const tracks: [string, number, number][] = [['a-1', 0.9, 440], ['a-2', 0.8, 520], ['a-3', 0.7, 610], ['a-4', 0.6, 700], ['a-5', 0.5, 790], ['a-6', 0.4, 880]];
    const sizes = tracks.map(([id, amp, hz]) => w.addTrack(id, amp, hz, {}, DEV, burstWav(amp, hz)));
    const size = sizes[0]!;
    cut.firstRound = 2;
    cut.calls = 0;
    try {
      const plan = await w.service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: size * 5 });
      if (!plan.ok) throw new Error(plan.reason);
      // Посылка: все шесть громкие — измерены все, неизмеримых нет.
      expect(plan.measured).toBe(6);
      expect(plan.unmeasured).toBe(0);
      // Режим упорядочил двоих; четверо — без места в очереди (на стволе до #2629 поля нет — красный).
      expect(plan.unranked).toBe(4);
      // Отбор не морозит их целиком (прод 07.10): под лимит на пять остаются пятеро, уходит одна.
      expect(plan.keep).toHaveLength(5);
      expect(plan.freeze).toHaveLength(1);
      expect(plan.keepBytes).toBeLessThanOrEqual(size * 5);
      expect(ids(plan.keep).slice(0, 2)).toEqual(['a-1', 'a-2']);
      // Хвост — по адресу, каждому ранг есть: `modeRank: null` у измеренной не остаётся.
      expect([...plan.keep, ...plan.freeze].every((r) => r.modeRank !== null)).toBe(true);
    } finally {
      cut.firstRound = null;
    }
  });

  it('настоящий режим на громком буфере упорядочивает всех — unranked 0 (строка в окне не появляется)', async () => {
    const { service, limitForTwo } = scene();
    const plan = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    if (!plan.ok) throw new Error(plan.reason);
    expect(plan.unranked).toBe(0);
    expect(plan.unmeasured).toBe(2);
  });

  it('отказ измерителя — отказ предпросмотра закрытым словарём, а не «весь буфер неизмерим»', async () => {
    const undecodable = fakeWorld();
    undecodable.addTrack('a', 0.9, 440);
    undecodable.addTrack('b', 0.3, 660);
    // Блобы — не WAV (как запись MediaRecorder): измеритель не раскодирует ни одной пробы.
    (undecodable.service as unknown as { blobs: { readBuffer: (ref: string) => Promise<Buffer> } }).blobs = {
      readBuffer: async () => Buffer.from('OggS — не RIFF/WAVE'),
    };
    const a = await undecodable.service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: 10_000_000 });
    expect(a.ok).toBe(false);
    expect(!a.ok && a.reason).toBe('measure_nothing_decodable');

    const tiny = fakeWorld();
    tiny.addTrack('only', 0.9, 440); // 0.5 с = 5 кадров < 20 — фон набора не измерен
    const b = await tiny.service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: 10_000_000 });
    expect(b.ok).toBe(false);
    expect(!b.ok && b.reason).toBe('measure_floor_not_measured');
    expect(tiny.db.batch.size).toBe(0);
  });

  it('ЗАМЕР: предпросмотр 60 проб по 0.5 с — время названо (развилка плана про кэш признаков)', async () => {
    const w = fakeWorld();
    for (let i = 0; i < 60; i += 1) w.addTrack(`t-${String(i).padStart(2, '0')}`, 0.1 + ((i * 7) % 9) / 10, 200 + i * 37);
    const started = Date.now();
    const plan = await w.service.preview(DEV, { criterion: 'spectral-variety', bufferLimitBytes: 48_044 * 30 });
    const total = Date.now() - started;
    if (!plan.ok) throw new Error(plan.reason);
    console.info(`[downgrade-archive preview] 60 проб × 0.5 с: измерение ${plan.measuredMs} мс, весь предпросмотр ${total} мс, keep ${plan.keep.length}, freeze ${plan.freeze.length}, measured ${plan.measured}`);
    expect(plan.keep.length + plan.freeze.length).toBe(60);
    expect(plan.keepBytes).toBeLessThanOrEqual(48_044 * 30);
    expect(total).toBeLessThan(30_000);
  });
});

describe('modeOrderOf — полный порядок раундами по 200', () => {
  it('ранжирует больше 200 кандидатов без потерь; порядок не зависит от порядка входа', async () => {
    const handlers = await import('@membrana/plugin-handlers');
    const cands = Array.from({ length: 450 }, (_, i) => ({
      entryId: `s${i}`, sampleId: `s${i}`, at: i, deltaDb: (i * 37) % 97, peakDb: -10, flatness: 0.1, structure: 'tonal' as const, durationSec: 1,
      features: { centroidHz: 1000, rolloffHz: 4000, flatness: 0.1, zeroCrossingRate: 0.05, flux: 0.2 },
    }));
    const a = modeOrderOf(handlers, cands, 'loudness-over-floor');
    const b = modeOrderOf(handlers, [...cands].reverse(), 'loudness-over-floor');
    expect(a.size).toBe(450);
    expect([...a.entries()]).toEqual([...b.entries()]);
    const byRank = [...a.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => cands.find((c) => c.sampleId === id)!.deltaDb);
    for (let i = 1; i < byRank.length; i += 1) expect(byRank[i]!).toBeLessThanOrEqual(byRank[i - 1]!);
  });
});

describe('freeze — только по подтверждённому плану, до commit тарифа', { timeout: 60_000 }, () => {
  const orderOf = (plan: { planDigest: string }, limit: number, over: Record<string, unknown> = {}) => ({
    criterion: 'loudness-over-floor', bufferLimitBytes: limit, planDigest: plan.planDigest, retentionDays: 14,
    membraneId: 'm-1', fromTariffId: 'checkpoint-v1', toTariffId: 'free-v1', ...over,
  });

  it('без planDigest — preview_required; с чужим — plan_stale; ничего не заморожено', async () => {
    const { service, db, limitForTwo } = scene();
    const none = await service.freeze(DEV, orderOf({ planDigest: '' }, limitForTwo), NOW);
    expect(none.ok === false && none.reason).toBe('preview_required');
    const stale = await service.freeze(DEV, orderOf({ planDigest: 'f'.repeat(64) }, limitForTwo), NOW);
    expect(stale.ok === false && stale.reason).toBe('plan_stale');
    expect(db.batch.size).toBe(0);
    expect(db.sample.rows.size).toBe(5);
  });

  it('буфер изменился после предпросмотра (новая запись) — plan_stale, а не «заморозим что есть»', async () => {
    const { service, addTrack, limitForTwo } = scene();
    const plan = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    if (!plan.ok) throw new Error(plan.reason);
    addTrack('late', 0.5, 1000);
    const out = await service.freeze(DEV, orderOf(plan, limitForTwo), NOW);
    expect(out.ok === false && out.reason).toBe('plan_stale');
  });

  it('по верному плану: партия frozen, живыми остались ровно keep, getQuota = keepBytes ≤ лимит, expiresAt = now + 14 сут; повтор — та же партия', async () => {
    const { service, db, devices, limitForTwo, size } = scene();
    const plan = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    if (!plan.ok) throw new Error(plan.reason);

    const ack = await service.freeze(DEV, orderOf(plan, limitForTwo), NOW);
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    expect(ack.idempotent).toBe(false);
    expect(ack.batch.state).toBe('frozen');
    expect(ack.batch.sampleCount).toBe(3);
    expect(ack.batch.frozenBytes).toBe(size * 3);
    expect(ack.batch.keptBytes).toBe(size * 2);
    expect(ack.batch.expiresAt.getTime()).toBe(NOW.getTime() + 14 * DAY);
    expect(ack.activeBufferBytes).toBe(size * 2);
    expect([...db.sample.rows.keys()].sort()).toEqual(['l-06', 'l-09']);
    expect(db.archived.get('l-03')?.['modeRank']).toBe(2);
    expect(db.archived.get('q-1')?.['modeRank']).toBeNull();
    expect((await devices.getQuota(DEV)).buffer.usedBytes).toBe(size * 2);

    const again = await service.freeze(DEV, orderOf(plan, limitForTwo), NOW);
    expect(again.ok && again.idempotent).toBe(true);
    expect(again.ok && again.batch.batchId).toBe(ack.batch.batchId);
    expect(db.batch.size).toBe(1);
  });

  it('retentionDays 0 — invalid_retention, партии нет', async () => {
    const { service, db, limitForTwo } = scene();
    const plan = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    if (!plan.ok) throw new Error(plan.reason);
    const out = await service.freeze(DEV, orderOf(plan, limitForTwo, { retentionDays: 0 }), NOW);
    expect(out.ok === false && out.reason).toBe('invalid_retention');
    expect(db.batch.size).toBe(0);
  });
});

describe('restore — рукой, целой партией, только если помещается', { timeout: 60_000 }, () => {
  async function frozenScene() {
    const sc = scene();
    const plan = await sc.service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: sc.limitForTwo });
    if (!plan.ok) throw new Error(plan.reason);
    const ack = await sc.service.freeze(DEV, {
      criterion: 'loudness-over-floor', bufferLimitBytes: sc.limitForTwo, planDigest: plan.planDigest, retentionDays: 14,
      membraneId: 'm-1', fromTariffId: 'checkpoint-v1', toTariffId: 'free-v1',
    }, NOW);
    if (!ack.ok) throw new Error(ack.reason);
    sc.device.bufferQuotaBytes = BigInt(sc.limitForTwo);
    return { ...sc, batchId: ack.batch.batchId };
  }

  it('не помещается под текущий лимит — insufficient_quota с числами, строки не тронуты', async () => {
    const { service, db, batchId, size } = await frozenScene();
    const out = await service.restore(DEV, batchId, new Date(NOW.getTime() + DAY));
    expect(out.ok === false && out.reason).toBe('insufficient_quota');
    expect(out.ok === false && out.detail).toContain(`занято ${size * 2} из ${size * 2}`);
    expect(db.archived.size).toBe(3);
  });

  it('тариф снова старший (лимит вырос) — партия возвращается целиком, квота = 5 проб, повтор — batch_not_frozen', async () => {
    const { service, db, devices, device, batchId, size } = await frozenScene();
    device.bufferQuotaBytes = BigInt(size * 10);
    const out = await service.restore(DEV, batchId, new Date(NOW.getTime() + DAY));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect([...out.restored].sort()).toEqual(['l-03', 'q-1', 'q-2']);
    expect(out.batch.state).toBe('restored');
    expect(db.sample.rows.size).toBe(5);
    expect(db.archived.size).toBe(0);
    expect((await devices.getQuota(DEV)).buffer.usedBytes).toBe(size * 5);
    const again = await service.restore(DEV, batchId, new Date(NOW.getTime() + DAY));
    expect(again.ok === false && again.reason).toBe('batch_not_frozen');
  });

  it('срок вышел — archive_expired; чужая партия и неизвестный id — batch_not_found', async () => {
    const { service, db, device, batchId, size } = await frozenScene();
    device.bufferQuotaBytes = BigInt(size * 10);
    const expired = await service.restore(DEV, batchId, new Date(NOW.getTime() + 14 * DAY));
    expect(expired.ok === false && expired.reason).toBe('archive_expired');
    expect(db.archived.size).toBe(3);
    const foreign = await service.restore(OTHER, batchId, NOW);
    expect(foreign.ok === false && foreign.reason).toBe('batch_not_found');
    const nope = await service.restore(DEV, 'nope', NOW);
    expect(nope.ok === false && nope.reason).toBe('batch_not_found');
  });

  it('listBatches отдаёт партии прибора со сроком', async () => {
    const { service, batchId } = await frozenScene();
    const list = await service.listBatches(DEV);
    expect(list.map((b) => [b.batchId, b.state, b.sampleCount])).toEqual([[batchId, 'frozen', 3]]);
    expect(list[0]?.expiresAt.getTime()).toBe(NOW.getTime() + 14 * DAY);
  });
});

describe('по разбору Дынина (b3): хеш над содержимым, повтор — только тот же приказ, границы', { timeout: 60_000 }, () => {
  const orderOf = (plan: { planDigest: string }, limit: number, over: Record<string, unknown> = {}) => ({
    criterion: 'loudness-over-floor', bufferLimitBytes: limit, planDigest: plan.planDigest, retentionDays: 14,
    membraneId: 'm-1', fromTariffId: 'checkpoint-v1', toTariffId: 'free-v1', ...over,
  });

  it('проба подменена под тем же id (другой размер) — хеш другой, freeze по старому плану → plan_stale', async () => {
    const { service, db, limitForTwo } = scene();
    const before = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    if (!before.ok) throw new Error(before.reason);
    db.sample.rows.get('l-03')!['sizeBytes'] = (db.sample.rows.get('l-03')!['sizeBytes'] as number) + 1;
    const after = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    if (!after.ok) throw new Error(after.reason);
    expect(after.planDigest).not.toBe(before.planDigest);
    const out = await service.freeze(DEV, orderOf(before, limitForTwo), NOW);
    expect(out.ok === false && out.reason).toBe('plan_stale');
    expect(db.batch.size).toBe(0);
  });

  it('тот же planDigest, но другой toTariffId / retentionDays / membraneId — отказ duplicate_plan с именами полей, не idempotent', async () => {
    const { service, db, limitForTwo } = scene();
    const plan = await service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: limitForTwo });
    if (!plan.ok) throw new Error(plan.reason);
    const ack = await service.freeze(DEV, orderOf(plan, limitForTwo), NOW);
    expect(ack.ok).toBe(true);

    const other = await service.freeze(DEV, orderOf(plan, limitForTwo, { toTariffId: 'observatory-v1', retentionDays: 1 }), NOW);
    expect(other.ok).toBe(false);
    if (other.ok) return;
    expect(other.reason).toBe('duplicate_plan');
    expect(other.detail).toContain('retentionDays');
    expect(other.detail).toContain('toTariffId');
    expect(other.batch?.batchId).toBe(ack.ok ? ack.batch.batchId : '');

    const foreignMembrane = await service.freeze(DEV, orderOf(plan, limitForTwo, { membraneId: 'm-2' }), NOW);
    expect(foreignMembrane.ok === false && foreignMembrane.detail).toContain('membraneId');
    expect(db.batch.size).toBe(1);
  });

  it('modeOrderOf: 201 кандидат — ровно граница раунда, все ранжированы; drone-likeness монотонен по плоскостности', async () => {
    const handlers = await import('@membrana/plugin-handlers');
    const mk = (i: number, deltaDb: number, flatness: number) => ({
      entryId: `s${i}`, sampleId: `s${String(i).padStart(3, '0')}`, at: i, deltaDb, peakDb: -10, flatness, structure: 'tonal' as const, durationSec: 1,
      features: { centroidHz: 1000 + i, rolloffHz: 4000, flatness, zeroCrossingRate: 0.05, flux: 0.2 },
    });
    const cands = Array.from({ length: 201 }, (_, i) => mk(i, (i * 31) % 89, ((i * 17) % 100) / 100));
    const loud = modeOrderOf(handlers, cands, 'loudness-over-floor');
    expect(loud.size).toBe(201);
    expect(new Set(loud.values()).size).toBe(201);
    const drone = modeOrderOf(handlers, cands, 'drone-likeness');
    const flatByRank = [...drone.entries()].sort((x, y) => x[1] - y[1]).map(([id]) => cands.find((c) => c.sampleId === id)!.flatness);
    for (let i = 1; i < flatByRank.length; i += 1) expect(flatByRank[i]!).toBeGreaterThanOrEqual(flatByRank[i - 1]!);
  });

  it('modeOrderOf: spectral-variety на 250 кандидатах с кластером из 10 одинаковых — без потерь, без дублей, детерминирован', async () => {
    const handlers = await import('@membrana/plugin-handlers');
    const cands = Array.from({ length: 250 }, (_, i) => {
      const clustered = i < 10;
      return {
        entryId: `s${i}`, sampleId: `s${String(i).padStart(3, '0')}`, at: i, deltaDb: clustered ? 50 - i * 0.01 : (i * 29) % 40,
        peakDb: -10, flatness: clustered ? 0.1 : ((i * 13) % 100) / 100, structure: 'tonal' as const, durationSec: 1 + (clustered ? 0 : (i % 7)),
        features: clustered
          ? { centroidHz: 1000, rolloffHz: 4000, flatness: 0.1, zeroCrossingRate: 0.05, flux: 0.2 }
          : { centroidHz: 300 + i * 41, rolloffHz: 1500 + i * 37, flatness: ((i * 13) % 100) / 100, zeroCrossingRate: (i % 10) / 10, flux: (i % 5) / 5 },
      };
    });
    const a = modeOrderOf(handlers, cands, 'spectral-variety');
    const b = modeOrderOf(handlers, [...cands].reverse(), 'spectral-variety');
    expect(a.size).toBe(250);
    expect(new Set(a.values()).size).toBe(250);
    expect([...a.entries()].sort()).toEqual([...b.entries()].sort());
    // Лидер кластера — первый (самый громкий), его копии вытеснены: не все десять подряд в голове.
    const head = [...a.entries()].sort((x, y) => x[1] - y[1]).slice(0, 10).map(([id]) => id);
    expect(head[0]).toBe('s000');
    expect(head.filter((id) => id < 's010').length).toBeLessThan(10);
  });

  it('границы restore: ровно expiresAt — archive_expired; стало бы ровно лимит — помещается', async () => {
    const sc = scene();
    const plan = await sc.service.preview(DEV, { criterion: 'loudness-over-floor', bufferLimitBytes: sc.limitForTwo });
    if (!plan.ok) throw new Error(plan.reason);
    const ack = await sc.service.freeze(DEV, orderOf(plan, sc.limitForTwo), NOW);
    if (!ack.ok) throw new Error(ack.reason);

    sc.device.bufferQuotaBytes = BigInt(sc.size * 5);
    const atExpiry = await sc.service.restore(DEV, ack.batch.batchId, new Date(NOW.getTime() + 14 * DAY));
    expect(atExpiry.ok === false && atExpiry.reason).toBe('archive_expired');

    // used (2) + frozen (3) == limit (5) — граница включительна, партия возвращается.
    const exact = await sc.service.restore(DEV, ack.batch.batchId, new Date(NOW.getTime() + 14 * DAY - 1));
    expect(exact.ok).toBe(true);
    expect((await sc.devices.getQuota(DEV)).buffer.usedBytes).toBe(sc.size * 5);
  });
});
