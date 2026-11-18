/**
 * Зубы исполнителя уборки с журналом (#2632 g3b; DoD: dry-run персистит прогон; повтор той же партии —
 * 0 rm; рестарт посреди партии не теряет долг; два параллельных live-пуска → один прогон; ответ несёт
 * runId; партий за прогон не больше K). Плюс прежние свойства b5: порядок «снимок → строки → файлы»,
 * сбой файла не откатывает партию, возвращённая партия — файлы целы.
 *
 * Журнал — НАСТОЯЩИЙ `PurgeJournalStore` (g1b) на таблицах в памяти; политика g3a — настоящая. Стабы —
 * только хранилище архива, Prisma-строки архива и диск.
 */
import { describe, expect, it } from 'vitest';

import { PurgeGcRunner, PURGE_BATCHES_PER_RUN } from './purge-gc.runner';
import { PURGE_JOB_LEASE_MS, PurgeJournalStore } from './purge-journal.store';
import { PURGE_BACKOFF_BASE_MS } from './purge-retry-policy';

const T0 = new Date('2026-11-18T12:00:00Z');
const at = (ms: number): Date => new Date(T0.getTime() + ms);
type Row = Record<string, unknown> & { id: string };

/** Таблицы журнала: ровно условия, которыми пользуется `PurgeJournalStore` (как в его зубах). */
function journalTables() {
  const t = (v: unknown): number => (v instanceof Date ? v.getTime() : (v as number));
  const matches = (row: Row, where: Record<string, unknown>): boolean =>
    Object.entries(where).every(([k, v]) => {
      if (k === 'AND') return (v as Record<string, unknown>[]).every((w) => matches(row, w));
      if (k === 'OR') return (v as Record<string, unknown>[]).some((w) => matches(row, w));
      if (v === null) return row[k] == null;
      if (v instanceof Date) return row[k] instanceof Date && t(row[k]) === v.getTime();
      if (typeof v === 'object') {
        const op = v as { lt?: Date | number; lte?: Date | number; not?: unknown; in?: unknown[] };
        if (op.in) return op.in.includes(row[k]);
        if ('not' in op) return row[k] !== op.not;
        if (row[k] == null) return false;
        return op.lt !== undefined ? t(row[k]) < t(op.lt) : t(row[k]) <= t(op.lte!);
      }
      return row[k] === v;
    });
  const table = (defaults: Row | (() => Record<string, unknown>), unique?: (a: Row, b: Row) => boolean) => {
    const rows = new Map<string, Row>();
    let seq = 0;
    return {
      rows,
      create: async ({ data }: { data: Row }) => {
        const row = { ...(typeof defaults === 'function' ? defaults() : defaults), ...data, id: `id-${++seq}` } as Row;
        if (unique && [...rows.values()].some((r) => unique(r, row))) throw Object.assign(new Error('unique'), { code: 'P2002' });
        rows.set(row.id, row);
        return { ...row };
      },
      findUnique: async ({ where }: { where: Record<string, unknown> }) => {
        if (typeof where['id'] === 'string') return rows.get(where['id']) ?? null;
        const k = where['runId_batchId'] as { runId: string; batchId: string };
        return [...rows.values()].find((r) => r['runId'] === k.runId && r['batchId'] === k.batchId) ?? null;
      },
      findMany: async ({ where, take }: { where: Record<string, unknown>; take?: number }) => [...rows.values()].filter((r) => matches(r, where)).slice(0, take),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Row }) => {
        const hits = [...rows.values()].filter((r) => matches(r, where));
        for (const h of hits) rows.set(h.id, { ...h, ...data });
        return { count: hits.length };
      },
    };
  };
  return {
    coldArchivePurgeRun: table(() => ({ status: 'running', finishedAt: null, jobsTotal: 0, jobsSucceeded: 0, jobsFailed: 0, jobsDeadLetter: 0, bytesFreed: 0n, errorSummary: null })),
    coldArchivePurgeJob: table(
      () => ({ status: 'pending', attempt: 0, nextAttemptAt: null, leaseUntil: null, outcomes: {}, bytesFreed: 0n, lastError: null, batchId: null, deviceId: null }),
      (a, b) => a['runId'] === b['runId'] && a['batchId'] != null && a['batchId'] === b['batchId'],
    ),
  };
}

/** Мир: партии архива с файлами на «диске»; общий между процессами (рестарт = новый исполнитель). */
function world(batchCount = 2) {
  const calls: string[] = [];
  const db = journalTables();
  const batches = new Map<string, { state: string; refs: string[] }>();
  const disk = new Set<string>();
  const rotten = new Set<string>();
  for (let i = 1; i <= batchCount; i += 1) {
    const refs = [`d/${i}-a.wav`, `d/${i}-b.wav`];
    batches.set(`b-${i}`, { state: 'frozen', refs });
    refs.forEach((r) => disk.add(r));
  }
  const archive = {
    purgeExpired: async () => ({
      candidates: [...batches].filter(([, b]) => b.state === 'frozen').map(([batchId]) => ({ batchId, deviceId: 'd', expiresAt: T0, sampleCount: 2, frozenBytes: 10 })),
    }),
    markPurged: async (batchId: string) => {
      calls.push(`markPurged(${batchId})`);
      const b = batches.get(batchId)!;
      if (b.state !== 'frozen') return { ok: false as const, refusal: { reason: 'batch_not_frozen' as const, detail: batchId } };
      b.state = 'deleted';
      b.refs = [];
      return { ok: true as const, deletedRows: 2 };
    },
  };
  const prisma = {
    ...db,
    downgradeArchivedSample: {
      findMany: async ({ where }: { where: { batchId: string } }) => {
        calls.push(`rows(${where.batchId})`);
        return batches.get(where.batchId)!.refs.map((storageRef) => ({ storageRef }));
      },
    },
    downgradeArchiveBatch: { findUnique: async ({ where }: { where: { id: string } }) => ({ state: batches.get(where.id)!.state }) },
  };
  let gate: Promise<void> | null = null;
  const blobs = {
    removeWithProof: async (ref: string) => {
      calls.push(`rm(${ref})`);
      if (gate) {
        // замирает ровно первый rm после hold(): «процесс умер посреди партии»
        const g = gate;
        gate = null;
        await g;
      }
      const before = disk.has(ref);
      if (before && !rotten.has(ref)) disk.delete(ref);
      const after = disk.has(ref);
      return { storageRef: ref, beforeExists: before, afterExists: after, action: after ? 'failed' : before ? 'removed' : 'already_absent', bytesFreed: before && !after ? 5 : 0, ...(after ? { error: 'rm:EACCES' } : {}) } as const;
    },
  };
  const journal = new PurgeJournalStore(db as never);
  const runner = () => new PurgeGcRunner(archive as never, journal, prisma as never, blobs as never);
  const hold = () => {
    let release!: () => void;
    gate = new Promise((r) => (release = r));
    return release;
  };
  return { calls, db, batches, disk, rotten, archive, runner, hold, jobs: () => [...db.coldArchivePurgeJob.rows.values()], runs: () => [...db.coldArchivePurgeRun.rows.values()] };
}

describe('PurgeGcRunner — dry-run', () => {
  it('персистит прогон и задания со снимком путей; markPurged и rm — 0; live потом их не подбирает', async () => {
    const w = world();
    const report = await w.runner().run(T0, { dryRun: true });
    expect(report.runId).toEqual(expect.any(String));
    expect(w.runs()).toEqual([expect.objectContaining({ mode: 'dry_run', status: 'succeeded', jobsTotal: 2, bytesFreed: 0n })]);
    expect(w.jobs().map((j) => [j['batchId'], j['storageRefs'], j['status']])).toEqual([
      ['b-1', ['d/1-a.wav', 'd/1-b.wav'], 'succeeded'],
      ['b-2', ['d/2-a.wav', 'd/2-b.wav'], 'succeeded'],
    ]);
    expect(w.calls.filter((c) => !c.startsWith('rows'))).toEqual([]);
    expect(w.disk.size).toBe(4);

    await w.runner().run(at(1000), { dryRun: false });
    expect(w.calls.filter((c) => c.startsWith('markPurged'))).toEqual(['markPurged(b-1)', 'markPurged(b-2)']);
  });
});

describe('PurgeGcRunner — live', () => {
  it('порядок по партии: снимок путей → markPurged → rm; ответ несёт runId и поля b6; прогон закрыт счётчиками', async () => {
    const w = world();
    const report = await w.runner().run(T0, { dryRun: false });
    expect(w.calls).toEqual(['rows(b-1)', 'markPurged(b-1)', 'rm(d/1-a.wav)', 'rm(d/1-b.wav)', 'rows(b-2)', 'markPurged(b-2)', 'rm(d/2-a.wav)', 'rm(d/2-b.wav)']);
    expect(report).toMatchObject({ dryRun: false, runId: expect.any(String), purged: ['b-1', 'b-2'], purgedIds: ['b-1', 'b-2'], refused: [], blobs: { deleted: 4, failed: 0 }, refusal: null, frozenBytes: 20 });
    expect(w.runs()[0]).toMatchObject({ mode: 'live', status: 'succeeded', jobsTotal: 2, jobsSucceeded: 2, bytesFreed: 20n });
    expect(w.jobs()[0]!['outcomes']).toEqual({
      'd/1-a.wav': { beforeExists: true, afterExists: false, action: 'removed' },
      'd/1-b.wav': { beforeExists: true, afterExists: false, action: 'removed' },
    });
    expect(w.disk.size).toBe(0);
  });

  it('повтор после уборки: 0 rm, 0 markPurged, прогон — строка succeeded с нулями', async () => {
    const w = world();
    await w.runner().run(T0, { dryRun: false });
    w.calls.length = 0;
    const again = await w.runner().run(at(1000), { dryRun: false });
    expect(w.calls).toEqual([]);
    expect(again.purged).toEqual([]);
    expect(w.runs()[1]).toMatchObject({ status: 'succeeded', jobsTotal: 0, bytesFreed: 0n });
  });

  it(`не больше K = ${PURGE_BATCHES_PER_RUN} новых партий за прогон; остаток — следующему`, async () => {
    const w = world(PURGE_BATCHES_PER_RUN + 5);
    const first = await w.runner().run(T0, { dryRun: false });
    expect(first.purged).toHaveLength(PURGE_BATCHES_PER_RUN);
    const second = await w.runner().run(at(1000), { dryRun: false });
    expect(second.purged).toHaveLength(5);
  });

  it('сбой файла не откатывает партию: партия deleted, задание retry, долг добирается следующим прогоном по сроку', async () => {
    const w = world(1);
    w.rotten.add('d/1-b.wav');
    const first = await w.runner().run(T0, { dryRun: false });
    expect(first).toMatchObject({ purged: ['b-1'], blobs: { deleted: 1, failed: 1 } });
    expect(w.jobs()[0]).toMatchObject({ status: 'retry', attempt: 1 });

    w.rotten.clear();
    w.calls.length = 0;
    await w.runner().run(at(PURGE_BACKOFF_BASE_MS - 1), { dryRun: false });
    expect(w.calls).toEqual([]);
    await w.runner().run(at(PURGE_BACKOFF_BASE_MS), { dryRun: false });
    expect(w.calls).toEqual(['markPurged(b-1)', 'rm(d/1-a.wav)', 'rm(d/1-b.wav)']);
    expect(w.jobs()).toHaveLength(1);
    expect(w.jobs()[0]).toMatchObject({ status: 'succeeded', attempt: 2 });
    expect(w.disk.size).toBe(0);
  });

  it('партию вернули между снимком и markPurged: refused, файлы не тронуты, задание закрыто без путей', async () => {
    const w = world(1);
    const original = w.archive.markPurged;
    w.archive.markPurged = async (id: string) => {
      w.batches.get(id)!.state = 'restored';
      return original(id);
    };
    const report = await w.runner().run(T0, { dryRun: false });
    expect(report.refused).toEqual([{ batchId: 'b-1', refusal: expect.objectContaining({ reason: 'batch_not_frozen' }) }]);
    expect(w.calls.filter((c) => c.startsWith('rm'))).toEqual([]);
    expect(w.jobs()[0]).toMatchObject({ status: 'succeeded', outcomes: {} });
    expect(w.disk.size).toBe(2);
  });

  it('рестарт посреди партии (после markPurged, до rm): долг цел — до истечения лиза не берётся, после — файлы добраны', async () => {
    const w = world(1);
    const release = w.hold();
    const crashed = w.runner().run(T0, { dryRun: false });
    await new Promise((r) => setTimeout(r, 0));
    expect(w.batches.get('b-1')!.state).toBe('deleted');
    // процесс «умер»: прогон висит running, задание claimed; новый процесс — новый исполнитель
    w.calls.length = 0;
    await w.runner().run(at(PURGE_JOB_LEASE_MS - 1), { dryRun: false });
    expect(w.calls).toEqual([]);
    expect(w.runs()[0]!['status']).toBe('abandoned');

    await w.runner().run(at(PURGE_JOB_LEASE_MS + 1), { dryRun: false });
    expect(w.calls).toEqual(['markPurged(b-1)', 'rm(d/1-a.wav)', 'rm(d/1-b.wav)']);
    expect(w.jobs()).toEqual([expect.objectContaining({ status: 'succeeded', attempt: 1 })]);
    expect(w.disk.size).toBe(0);
    release();
    await crashed.catch(() => undefined);
  });

  it('два параллельных live-пуска → один прогон; второй — отказ purge_run_in_progress без runId; после — замок снят', async () => {
    const w = world(1);
    const runner = w.runner();
    const release = w.hold();
    const first = runner.run(T0, { dryRun: false });
    await new Promise((r) => setTimeout(r, 0));
    const second = await runner.run(T0, { dryRun: false });
    expect(second).toMatchObject({ runId: null, purged: [], refusal: { reason: 'purge_run_in_progress' } });
    release();
    expect((await first).purged).toEqual(['b-1']);
    expect(w.runs()).toHaveLength(1);
    expect((await runner.run(at(1000), { dryRun: false })).refusal).toBeNull();
  });

  it('обрыв прогона исключением: прогон failed, замок снят', async () => {
    const w = world(1);
    w.archive.markPurged = async () => {
      throw new TypeError('db down');
    };
    const runner = w.runner();
    await expect(runner.run(T0, { dryRun: false })).rejects.toThrow('db down');
    expect(w.runs()[0]).toMatchObject({ status: 'failed', errorSummary: 'TypeError' });
    await expect(runner.run(at(1000), { dryRun: false })).rejects.toThrow('db down');
    expect(w.runs()).toHaveLength(2);
  });
});
