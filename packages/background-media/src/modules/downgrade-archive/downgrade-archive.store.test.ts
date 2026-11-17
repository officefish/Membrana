/**
 * Зубы хранилища архива понижения (#2587 блок b2; ADR-0031).
 *
 * Без живой БД: хранилище-стаб ведёт себя как таблицы со схемой b2 (уникальный индекс
 * `(deviceId, planDigest)` отвергает вторую вставку; `$transaction` — интерактивный). Порча P2
 * плана: после переноса строки занятое буфера в `getQuota` НАСТОЯЩЕГО `DevicesService` уменьшается
 * ровно на `sizeBytes` — без правки `getQuota`. На стволе 66153f58 модуля и моделей нет: импорт
 * падает, зуб красный.
 */
import { describe, expect, it, vi } from 'vitest';

import { DevicesService } from '../devices/devices.service';

import {
  DowngradeArchiveStore,
  expiresAtOf,
  isPurgeDue,
  type ArchiveSamplesInput,
} from './downgrade-archive.store';

class UniqueViolation extends Error {
  readonly code = 'P2002';
}

const DEV = 'dev-1';
const NOW = new Date('2026-10-05T12:00:00Z');
const DAY = 86_400_000;

type Row = Record<string, unknown> & { id: string };

/** Таблицы в памяти с ровно теми глаголами Prisma, которыми пользуются store и getQuota. */
function fakePrisma() {
  const sample = new Map<string, Row>();
  const batch = new Map<string, Row>();
  const archived = new Map<string, Row>();
  let seq = 0;

  const matches = (row: Row, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (k === 'batch') return (batch.get(row['batchId'] as string) as Row)['state'] === (v as { state: string }).state;
      if (v !== null && typeof v === 'object' && 'not' in (v as object)) return row[k] !== (v as { not: unknown }).not;
      if (v !== null && typeof v === 'object' && 'in' in (v as object)) return ((v as { in: string[] }).in).includes(row[k] as string);
      if (v !== null && typeof v === 'object' && 'lte' in (v as object)) return (row[k] as Date).getTime() <= ((v as { lte: Date }).lte).getTime();
      return row[k] === v;
    });
  const withCount = (b: Row): Row => ({
    ...b,
    _count: { samples: [...archived.values()].filter((r) => r['batchId'] === b.id).length },
  });

  const db = {
    batch,
    archived,
    /** Делегат Prisma для "Sample" + сама Map (`rows`) для прямых проверок зуба. */
    sample: {
      rows: sample,
      findMany: async ({ where }: { where: Record<string, unknown> }) => [...sample.values()].filter((r) => matches(r, where)),
      createMany: async ({ data }: { data: Row[] }) => {
        for (const d of data) {
          if (sample.has(d.id)) throw new UniqueViolation('pk');
          sample.set(d.id, { ...d, collection: { kind: 'buffer', systemKey: null } });
        }
        return { count: data.length };
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const victims = [...sample.values()].filter((r) => matches(r, where));
        for (const v of victims) sample.delete(v.id);
        return { count: victims.length };
      },
    },
    device: {
      findUnique: vi.fn(async () => ({
        id: DEV,
        membraneId: 'm-1',
        tariffContractVersion: 1,
        userStorageQuotaBytes: 10_000n,
        bufferQuotaBytes: 500n,
        datasetCatalogId: 'catalog-free',
        maxUserWorkspaces: 3,
        bufferPolicy: 'stop',
        bufferPolicyParams: null,
      })),
    },
    deviceWorkspace: { count: async () => 0 },
    downgradeArchiveBatch: {
      create: async ({ data }: { data: Row }) => {
        for (const b of batch.values()) {
          if (b['deviceId'] === data['deviceId'] && b['planDigest'] === data['planDigest']) throw new UniqueViolation('unique');
        }
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
        const cur = batch.get(where.id)!;
        const next = { ...cur, ...data };
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
      createMany: async ({ data }: { data: Row[] }) => {
        for (const d of data) archived.set(d.id, { ...d });
        return { count: data.length };
      },
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
    /** Интерактивная транзакция С ОТКАТОМ: исключение внутри возвращает все три таблицы к снимку. */
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      const snapshot = [sample, batch, archived].map((m) => new Map(m));
      try {
        return await fn(db);
      } catch (e) {
        [sample, batch, archived].forEach((m, i) => {
          m.clear();
          for (const [k, v] of snapshot[i]!) m.set(k, v);
        });
        throw e;
      }
    },
  };
  return db;
}

const CONFIG = {
  MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1_000,
  MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 2_000,
  MEDIA_DEFAULT_DATASET_CATALOG_ID: 'catalog-free',
  MEDIA_DEFAULT_MAX_USER_WORKSPACES: 3,
} as never;

function bufferSample(id: string, sizeBytes: number): Row {
  return {
    id,
    deviceId: DEV,
    collectionId: '__buffer__',
    title: `t-${id}`,
    class: 'unknown',
    label: 'unlabeled',
    source: 'mic_recording',
    durationSec: 1.5,
    sampleRate: 48_000,
    channels: 1,
    audioFormat: 'wav',
    contentType: 'audio/wav',
    sizeBytes,
    storageRef: `${DEV}/${id}.wav`,
    notes: null,
    createdAt: new Date('2026-10-01T00:00:00Z'),
    collection: { kind: 'buffer', systemKey: null },
  };
}

function setup() {
  const db = fakePrisma();
  for (const r of [bufferSample('s1', 100), bufferSample('s2', 200), bufferSample('s3', 300)]) db.sample.rows.set(r.id, r);
  const store = new DowngradeArchiveStore(db as never);
  const devices = new DevicesService(db as never, CONFIG, {} as never);
  return { db, store, devices };
}

const order = (over: Partial<ArchiveSamplesInput> = {}): ArchiveSamplesInput => ({
  deviceId: DEV,
  membraneId: 'm-1',
  fromTariffId: 'checkpoint-v1',
  toTariffId: 'free-v1',
  criterion: 'loudness-over-floor',
  planDigest: 'digest-a',
  retentionDays: 14,
  keptBytes: 300,
  picks: [
    { sampleId: 's1', modeRank: 3 },
    { sampleId: 's2', modeRank: null },
  ],
  ...over,
});

describe('P2 — перенос строки уменьшает занятое буфера БЕЗ правки getQuota', () => {
  it('занятое было 600, после заморозки s1+s2 стало ровно 300; строки под теми же id в архиве', async () => {
    const { db, store, devices } = setup();
    expect((await devices.getQuota(DEV)).buffer.usedBytes).toBe(600);

    const out = await store.archiveSamples(order(), NOW);
    expect(out.refusal).toBeNull();
    expect(out.missing).toEqual([]);
    expect(out.batch?.state).toBe('frozen');
    expect(out.batch?.frozenBytes).toBe(300);
    expect(out.batch?.keptBytes).toBe(300);
    expect(out.batch?.sampleCount).toBe(2);
    expect(out.batch?.expiresAt.getTime()).toBe(NOW.getTime() + 14 * DAY);

    expect((await devices.getQuota(DEV)).buffer.usedBytes).toBe(300);
    expect(db.sample.rows.has('s1')).toBe(false);
    expect(db.sample.rows.has('s2')).toBe(false);
    expect(db.sample.rows.has('s3')).toBe(true);
    expect(db.archived.get('s1')?.['storageRef']).toBe(`${DEV}/s1.wav`);
    expect(db.archived.get('s1')?.['modeRank']).toBe(3);
    expect(db.archived.get('s2')?.['modeRank']).toBeNull();
    expect(db.archived.get('s2')?.['batchId']).toBe(out.batch?.batchId);
  });

  it('повтор с тем же planDigest — duplicate_plan, та же партия, вторая не заводится, строки не трогаются', async () => {
    const { db, store } = setup();
    const first = await store.archiveSamples(order(), NOW);
    const again = await store.archiveSamples(order({ picks: [{ sampleId: 's3', modeRank: 0 }] }), NOW);
    expect(again.refusal?.reason).toBe('duplicate_plan');
    expect(again.batch?.batchId).toBe(first.batch?.batchId);
    expect(db.batch.size).toBe(1);
    expect(db.sample.rows.has('s3')).toBe(true);
  });

  it('исчезнувшая проба — партия failed + partial_freeze; перенесённые остаются и видны как хвост', async () => {
    const { db, store } = setup();
    const out = await store.archiveSamples(order({ picks: [{ sampleId: 's1', modeRank: 0 }, { sampleId: 'ghost', modeRank: 1 }] }), NOW);
    expect(out.refusal?.reason).toBe('partial_freeze');
    expect(out.refusal?.detail).toContain('1 из 2');
    expect(out.missing).toEqual(['ghost']);
    expect(out.batch?.state).toBe('failed');
    expect(out.batch?.sampleCount).toBe(1);
    expect(db.sample.rows.has('s1')).toBe(false);
    expect(await store.failedTailOf(DEV)).toEqual(['s1']);
  });

  it('retentionDays не целое ≥ 1 — invalid_retention, партии и переноса нет', async () => {
    const { db, store } = setup();
    for (const bad of [0, 1.5, -3, Number.NaN]) {
      const out = await store.archiveSamples(order({ retentionDays: bad }), NOW);
      expect(out.refusal?.reason).toBe('invalid_retention');
      expect(out.batch).toBeNull();
    }
    expect(db.batch.size).toBe(0);
    expect(db.sample.rows.size).toBe(3);
  });
});

describe('возврат партии', () => {
  it('строки едут обратно под прежними id, партия restored, занятое снова 600', async () => {
    const { db, store, devices } = setup();
    const { batch } = await store.archiveSamples(order(), NOW);
    const out = await store.restoreBatch(batch!.batchId, new Date(NOW.getTime() + DAY));
    expect(out.refusal).toBeNull();
    expect([...out.restored].sort()).toEqual(['s1', 's2']);
    expect(out.batch?.state).toBe('restored');
    expect(db.sample.rows.get('s1')?.['storageRef']).toBe(`${DEV}/s1.wav`);
    expect(db.archived.size).toBe(0);
    expect((db.batch.get(batch!.batchId) as Row)['restoredAt']).toEqual(new Date(NOW.getTime() + DAY));
    expect((await devices.getQuota(DEV)).buffer.usedBytes).toBe(600);
  });

  it('отказы: нет партии → batch_not_found; уже restored → batch_not_frozen; срок вышел → archive_expired', async () => {
    const { store } = setup();
    expect((await store.restoreBatch('nope', NOW)).refusal?.reason).toBe('batch_not_found');

    const { batch } = await store.archiveSamples(order(), NOW);
    await store.restoreBatch(batch!.batchId, NOW);
    expect((await store.restoreBatch(batch!.batchId, NOW)).refusal?.reason).toBe('batch_not_frozen');

    const { batch: b2 } = await store.archiveSamples(order({ planDigest: 'digest-b', picks: [{ sampleId: 's3', modeRank: 0 }] }), NOW);
    const expired = await store.restoreBatch(b2!.batchId, new Date(NOW.getTime() + 14 * DAY));
    expect(expired.refusal?.reason).toBe('archive_expired');
    expect(expired.restored).toEqual([]);
  });
});

describe('уборка по сроку — контракт для #2588', () => {
  async function threeBatches() {
    const s = setup();
    await s.store.archiveSamples(order({ planDigest: 'd-frozen', picks: [{ sampleId: 's1', modeRank: 0 }] }), NOW);
    const failed = await s.store.archiveSamples(order({ planDigest: 'd-failed', picks: [{ sampleId: 's2', modeRank: 0 }, { sampleId: 'ghost', modeRank: 1 }] }), NOW);
    await s.store.archiveSamples(order({ planDigest: 'd-fresh', retentionDays: 30, picks: [{ sampleId: 's3', modeRank: 0 }] }), NOW);
    expect(failed.batch?.state).toBe('failed');
    return s;
  }

  it('dryRun: кандидаты — только frozen с истёкшим сроком; failed и неистёкшие не трогаются; эффектов ноль', async () => {
    const { db, store } = await threeBatches();
    const at = new Date(NOW.getTime() + 14 * DAY);
    const out = await store.purgeExpired(at, { dryRun: true });
    expect(out.dryRun).toBe(true);
    expect(out.refusal).toBeNull();
    expect(out.purged).toEqual([]);
    expect(out.candidates.map((c) => c.batchId)).toEqual(['batch-1']);
    expect(out.candidates[0]).toMatchObject({ deviceId: DEV, sampleCount: 1, frozenBytes: 100 });
    expect([...db.batch.values()].map((b) => b['state'])).toEqual(['frozen', 'failed', 'frozen']);
  });

  it('без dryRun в b2 — названный отказ purge_not_implemented, ничего не удалено и не помечено', async () => {
    const { db, store } = await threeBatches();
    const out = await store.purgeExpired(new Date(NOW.getTime() + 14 * DAY), { dryRun: false });
    expect(out.refusal?.reason).toBe('purge_not_implemented');
    expect(out.purged).toEqual([]);
    expect(out.candidates).toHaveLength(1);
    expect(db.archived.size).toBe(3);
    expect((db.batch.get('batch-1') as Row)['state']).toBe('frozen');
  });

  it('markPurged — условное обновление: frozen ∧ истёк → deleted с deletedAt; иначе count 0 и отказ', async () => {
    const { db, store } = await threeBatches();
    const early = await store.markPurged('batch-1', new Date(NOW.getTime() + DAY));
    expect(early.ok).toBe(false);
    expect((db.batch.get('batch-1') as Row)['state']).toBe('frozen');

    const at = new Date(NOW.getTime() + 14 * DAY);
    expect(await store.markPurged('batch-1', at)).toEqual({ ok: true, deletedRows: 1 });
    expect((db.batch.get('batch-1') as Row)['state']).toBe('deleted');
    expect((db.batch.get('batch-1') as Row)['deletedAt']).toEqual(at);

    const failed = await store.markPurged('batch-2', at);
    expect(failed.ok).toBe(false);
    expect((db.batch.get('batch-2') as Row)['state']).toBe('failed');
  });

  it('listBatches отдаёт партии прибора с состоянием, сроком и счётом строк (хвост failed подобран третьей)', async () => {
    const { store } = await threeBatches();
    const list = await store.listBatches(DEV);
    // d-fresh шла ПОСЛЕ d-failed и переподчинила себе её строку s2: у failed ноль строк (след),
    // у d-fresh две — слово владельца 05.10 о хвосте failed-партий.
    expect(list.map((b) => [b.planDigest, b.state, b.sampleCount])).toEqual([
      ['d-frozen', 'frozen', 1],
      ['d-failed', 'failed', 0],
      ['d-fresh', 'frozen', 2],
    ]);
    expect(list[2]?.expiresAt.getTime()).toBe(NOW.getTime() + 30 * DAY);
  });
});

describe('по разбору Веснина (b2): гонка, строки при уборке, одна партия', () => {
  it('проба исчезла между чтением и переносом → concurrent_change, транзакция откачена: ни партии, ни фантома, строки целы', async () => {
    const { db, store, devices } = setup();
    const read = db.sample.findMany;
    // Сосед удаляет s2 сразу после нашего чтения — ровно дыра findMany ↔ deleteMany.
    db.sample.findMany = async (args) => {
      const rows = await read(args);
      db.sample.findMany = read;
      db.sample.rows.delete('s2');
      return rows;
    };
    const out = await store.archiveSamples(order(), NOW);
    expect(out.refusal?.reason).toBe('concurrent_change');
    expect(out.refusal?.detail).toContain('ожидали перенести 2, удалено 1');
    expect(out.batch).toBeNull();
    expect(db.batch.size).toBe(0);
    expect(db.archived.size).toBe(0);
    // Откат вернул и s1 (он был удалён в транзакции), и s2 (его снёс «сосед» — внутри транзакции стаба).
    expect([...db.sample.rows.keys()].sort()).toEqual(['s1', 's2', 's3']);
    expect((await devices.getQuota(DEV)).buffer.usedBytes).toBe(600);
  });

  it('markPurged при count === 1 удаляет строки партии в той же транзакции; при отказе строки целы', async () => {
    const { db, store } = setup();
    const { batch } = await store.archiveSamples(order(), NOW);
    expect(db.archived.size).toBe(2);

    const early = await store.markPurged(batch!.batchId, NOW);
    expect(early.ok).toBe(false);
    expect(db.archived.size).toBe(2);

    const done = await store.markPurged(batch!.batchId, new Date(NOW.getTime() + 14 * DAY));
    expect(done).toEqual({ ok: true, deletedRows: 2 });
    expect(db.archived.size).toBe(0);
    expect((db.batch.get(batch!.batchId) as Row)['state']).toBe('deleted');
  });

  it('getBatch отдаёт одну партию со счётом строк; неизвестный id → null', async () => {
    const { store } = setup();
    const { batch } = await store.archiveSamples(order(), NOW);
    const one = await store.getBatch(batch!.batchId);
    expect(one).toMatchObject({ batchId: batch!.batchId, state: 'frozen', sampleCount: 2, frozenBytes: 300 });
    expect(await store.getBatch('nope')).toBeNull();
  });
});

describe('чистые предикаты', () => {
  it('expiresAtOf — ровно retentionDays суток от frozenAt', () => {
    expect(expiresAtOf(NOW, 1).toISOString()).toBe('2026-10-06T12:00:00.000Z');
    expect(expiresAtOf(NOW, 14).toISOString()).toBe('2026-10-19T12:00:00.000Z');
  });

  it('isPurgeDue — frozen и expiresAt ≤ now; граница включительна; failed/restored/deleted — никогда', () => {
    const exp = new Date(NOW.getTime() + DAY);
    expect(isPurgeDue({ state: 'frozen', expiresAt: exp }, exp)).toBe(true);
    expect(isPurgeDue({ state: 'frozen', expiresAt: exp }, new Date(exp.getTime() - 1))).toBe(false);
    for (const state of ['failed', 'restored', 'deleted'] as const) {
      expect(isPurgeDue({ state, expiresAt: exp }, new Date(exp.getTime() + DAY))).toBe(false);
    }
  });
});

describe('b3: подбор хвоста failed и post-condition до ack', () => {
  it('следующая заморозка переподчиняет строки failed-партии себе; failed остаётся следом с нулём строк', async () => {
    const { db, store } = setup();
    const failed = await store.archiveSamples(order({ planDigest: 'd-failed', picks: [{ sampleId: 's1', modeRank: 0 }, { sampleId: 'ghost', modeRank: 1 }] }), NOW);
    expect(failed.batch?.state).toBe('failed');

    const next = await store.archiveSamples(order({ planDigest: 'd-next', picks: [{ sampleId: 's2', modeRank: 0 }] }), NOW);
    expect(next.refusal).toBeNull();
    expect(next.batch?.state).toBe('frozen');
    expect(next.adopted).toBe(1);
    expect(next.batch?.sampleCount).toBe(2);
    expect(db.archived.get('s1')?.['batchId']).toBe(next.batch?.batchId);
    expect(db.archived.get('s2')?.['batchId']).toBe(next.batch?.batchId);
    expect([...db.archived.values()].filter((r) => r['batchId'] === failed.batch?.batchId)).toHaveLength(0);
    expect(await store.failedTailOf(DEV)).toEqual([]);
  });

  it('post-condition: живых байт после переноса ≤ лимита → frozen, activeBufferBytes назван', async () => {
    const { store } = setup();
    // Остаётся s3 (300): лимит 300 — ровно на границе, включительно.
    const out = await store.archiveSamples(order({ postCondition: { bufferLimitBytes: 300, bufferCollectionId: '__buffer__' } }), NOW);
    expect(out.refusal).toBeNull();
    expect(out.batch?.state).toBe('frozen');
    expect(out.activeBufferBytes).toBe(300);
  });

  it('post-condition ложен → партия failed + quota_invariant_violated; строки остаются в ней хвостом', async () => {
    const { db, store } = setup();
    const out = await store.archiveSamples(order({ postCondition: { bufferLimitBytes: 299, bufferCollectionId: '__buffer__' } }), NOW);
    expect(out.refusal?.reason).toBe('quota_invariant_violated');
    expect(out.refusal?.detail).toContain('300 > лимита 299');
    expect(out.batch?.state).toBe('failed');
    expect(out.activeBufferBytes).toBe(300);
    expect(db.archived.size).toBe(2);
    expect((db.batch.get(out.batch!.batchId) as Row)['state']).toBe('failed');
    expect([...(await store.failedTailOf(DEV))].sort()).toEqual(['s1', 's2']);
  });

  it('без postCondition проверки нет — activeBufferBytes null (b2-совместимость)', async () => {
    const { store } = setup();
    const out = await store.archiveSamples(order(), NOW);
    expect(out.activeBufferBytes).toBeNull();
    expect(out.adopted).toBe(0);
  });
});

describe('граница BigInt ↔ number (ревью #2604)', () => {
  it('строки партий в хранилище несут настоящий BigInt (как Prisma в проде), представление отдаёт number: сумма без TypeError, сравнение с лимитом верно', async () => {
    const { db, store } = setup();
    const { batch } = await store.archiveSamples(order({ postCondition: { bufferLimitBytes: 300, bufferCollectionId: '__buffer__' } }), NOW);
    const row = db.batch.get(batch!.batchId) as Row;
    // Прод-форма: store пишет BigInt(...) в create — стаб хранит как есть, без приведения.
    expect(typeof row['keptBytes']).toBe('bigint');
    expect(row['frozenBytes']).toBe(300n);
    // Смешение bigint и number в арифметике — TypeError; это и есть опасность, которую снимает граница.
    expect(() => (row['frozenBytes'] as bigint) + (300 as unknown as bigint)).toThrow(TypeError);

    // Граница store (viewOf → Number(...)): наружу — только number. Убрать Number(...) в viewOf —
    // зуб красный на typeof и на сумме.
    const view = await store.getBatch(batch!.batchId);
    expect(typeof view!.keptBytes).toBe('number');
    expect(typeof view!.frozenBytes).toBe('number');
    expect(view!.keptBytes + view!.frozenBytes).toBe(600);
    expect(view!.frozenBytes <= 300).toBe(true);

    const [listed] = await store.listBatches(DEV);
    expect(typeof listed!.frozenBytes).toBe('number');
    expect(listed!.frozenBytes + listed!.keptBytes).toBe(600);

    // Исход archiveSamples и partial/failed-ветка — тоже number.
    expect(typeof batch!.frozenBytes).toBe('number');
    const failed = await store.archiveSamples(order({ planDigest: 'd-f', picks: [{ sampleId: 's3', modeRank: 0 }, { sampleId: 'ghost', modeRank: 1 }] }), NOW);
    expect(typeof failed.batch!.frozenBytes).toBe('number');
    expect(failed.batch!.frozenBytes).toBe(300);
  });
});
