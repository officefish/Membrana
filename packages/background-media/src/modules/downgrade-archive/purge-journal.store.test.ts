/**
 * Зубы хранилища журнала уборщика (#2632 g1b; DoD: создание прогона, пустой прогон = строка
 * succeeded с нулями, захват по лизу не берёт чужое невыпущенное, повторный захват после истечения
 * лиза).
 *
 * Без живой БД: таблицы в памяти понимают ровно те условия Prisma, которыми пользуется хранилище
 * (`AND`/`OR`, равенство с `null`, `lt`/`lte`, `not`), и уникальность `(runId, batchId)` как в схеме
 * g1a (NULL различны). Условие захвата `claimableWhere` вычисляется фейком, а не повторено в зубе —
 * порча условия в хранилище краснит зубы лиза.
 */
import { describe, expect, it } from 'vitest';

import { PurgeJournalStore, claimableWhere } from './purge-journal.store';
import { EMPTY_RUN_COUNTERS, PURGE_MAX_ATTEMPTS, type RetryTransition } from './purge-retry-policy';

class UniqueViolation extends Error {
  readonly code = 'P2002';
}

type Row = Record<string, unknown> & { id: string };
type Where = Record<string, unknown>;

const T0 = new Date('2026-11-18T10:00:00Z');
const MIN = 60_000;
const at = (ms: number): Date => new Date(T0.getTime() + ms);

const time = (v: unknown): number => (v instanceof Date ? v.getTime() : (v as number));

function matches(row: Row, where: Where): boolean {
  return Object.entries(where).every(([k, v]) => {
    if (k === 'AND') return (v as Where[]).every((w) => matches(row, w));
    if (k === 'OR') return (v as Where[]).some((w) => matches(row, w));
    if (v === null) return row[k] === null || row[k] === undefined;
    if (v instanceof Date) return row[k] instanceof Date && time(row[k]) === v.getTime();
    if (typeof v === 'object') {
      const op = v as { lt?: Date | number; lte?: Date | number; not?: unknown; in?: unknown[] };
      const comparable = row[k] instanceof Date || typeof row[k] === 'number';
      if (op.lt !== undefined) return comparable && time(row[k]) < time(op.lt);
      if (op.lte !== undefined) return comparable && time(row[k]) <= time(op.lte);
      if ('not' in op) return row[k] !== op.not;
      if (op.in !== undefined) return op.in.includes(row[k]);
      throw new Error(`fake prisma: неизвестное условие ${k}=${JSON.stringify(v)}`);
    }
    return row[k] === v;
  });
}

function table(defaults: () => Row, unique?: (a: Row, b: Row) => boolean) {
  const rows = new Map<string, Row>();
  let seq = 0;
  return {
    rows,
    create: async ({ data }: { data: Row }) => {
      const row = { ...defaults(), ...data, id: `id-${++seq}` } as Row;
      if (unique && [...rows.values()].some((r) => unique(r, row))) throw new UniqueViolation('unique');
      rows.set(row.id, row);
      return { ...row };
    },
    findUnique: async ({ where }: { where: Where }) => {
      if (typeof where['id'] === 'string') return rows.get(where['id']) ?? null;
      const key = where['runId_batchId'] as { runId: string; batchId: string };
      return [...rows.values()].find((r) => r['runId'] === key.runId && r['batchId'] === key.batchId) ?? null;
    },
    findMany: async ({ where, take }: { where: Where; take?: number }) =>
      [...rows.values()].filter((r) => matches(r, where)).slice(0, take),
    updateMany: async ({ where, data }: { where: Where; data: Row }) => {
      const hits = [...rows.values()].filter((r) => matches(r, where));
      for (const h of hits) rows.set(h.id, { ...h, ...data });
      return { count: hits.length };
    },
  };
}

function fakePrisma() {
  return {
    coldArchivePurgeRun: table(() => ({
      status: 'running',
      finishedAt: null,
      jobsTotal: 0,
      jobsSucceeded: 0,
      jobsFailed: 0,
      jobsDeadLetter: 0,
      bytesFreed: 0n,
      errorSummary: null,
    })),
    coldArchivePurgeJob: table(
      () => ({ status: 'pending', attempt: 0, nextAttemptAt: null, leaseUntil: null, outcomes: {}, bytesFreed: 0n, lastError: null, batchId: null, deviceId: null }),
      (a, b) => a['runId'] === b['runId'] && a['batchId'] !== null && a['batchId'] === b['batchId'],
    ),
  };
}

function setup() {
  const db = fakePrisma();
  const store = new PurgeJournalStore(db as never);
  return { db, store };
}

const OPEN = { trigger: 'cron', mode: 'dry_run', enabledSnapshot: true, dryRunSnapshot: true } as const;

async function runWithJob(store: PurgeJournalStore) {
  const run = await store.openRun(OPEN, T0);
  const added = await store.addJob({ runId: run.runId, targetType: 'batch', batchId: 'b-1', deviceId: 'd-1', storageRefs: ['d-1/a.wav', 'd-1/b.wav'] });
  if (!added.ok) throw new Error('addJob refused');
  return { run, job: added.value.job };
}

const SUCCEEDED: RetryTransition = { status: 'succeeded', attempt: 1, nextAttemptAt: null, bytesFreed: 300, lastError: null };

describe('PurgeJournalStore — прогон', () => {
  it('создание прогона: строка running со снимками флагов, startedAt = now, нули', async () => {
    const { db, store } = setup();
    const run = await store.openRun({ trigger: 'panel', mode: 'live', enabledSnapshot: true, dryRunSnapshot: false }, T0);
    expect(db.coldArchivePurgeRun.rows.size).toBe(1);
    expect(run).toMatchObject({ trigger: 'panel', mode: 'live', status: 'running', startedAt: T0, finishedAt: null, enabledSnapshot: true, dryRunSnapshot: false });
    expect(run.counters).toEqual(EMPTY_RUN_COUNTERS);
  });

  it('пустой прогон = строка succeeded с нулями и finishedAt', async () => {
    const { db, store } = setup();
    const run = await store.openRun(OPEN, T0);
    const closed = await store.closeRun(run.runId, { status: 'succeeded' }, at(MIN));
    expect(closed.ok && closed.value).toMatchObject({ status: 'succeeded', finishedAt: at(MIN), counters: EMPTY_RUN_COUNTERS, errorSummary: null });
    expect(db.coldArchivePurgeRun.rows.get(run.runId)).toMatchObject({ status: 'succeeded', jobsTotal: 0, bytesFreed: 0n });
    expect(db.coldArchivePurgeJob.rows.size).toBe(0);
  });

  it('закрытие счётчиками; повторное закрытие и закрытие abandoned — отказ run_not_running', async () => {
    const { store } = setup();
    const run = await store.openRun(OPEN, T0);
    const counters = { jobsTotal: 3, jobsSucceeded: 1, jobsFailed: 1, jobsDeadLetter: 1, bytesFreed: 4096 };
    const closed = await store.closeRun(run.runId, { status: 'failed', counters, errorSummary: '2 пути: EACCES' }, at(MIN));
    expect(closed.ok && closed.value.counters).toEqual(counters);
    const again = await store.closeRun(run.runId, { status: 'succeeded' }, at(2 * MIN));
    expect(!again.ok && again.refusal.reason).toBe('run_not_running');

    const stale = await store.openRun(OPEN, T0);
    const fresh = await store.openRun(OPEN, at(MIN));
    expect(await store.markAbandoned(fresh.runId, at(MIN))).toBe(1);
    const revived = await store.closeRun(stale.runId, { status: 'succeeded' }, at(2 * MIN));
    expect(!revived.ok && revived.refusal.reason).toBe('run_not_running');
  });

  it('markAbandoned помечает только прочие running, текущий прогон не трогает', async () => {
    const { db, store } = setup();
    const old = await store.openRun(OPEN, T0);
    const done = await store.openRun(OPEN, T0);
    await store.closeRun(done.runId, { status: 'succeeded' }, T0);
    const cur = await store.openRun(OPEN, at(MIN));
    expect(await store.markAbandoned(cur.runId, at(MIN))).toBe(1);
    expect(db.coldArchivePurgeRun.rows.get(old.runId)).toMatchObject({ status: 'abandoned', finishedAt: at(MIN) });
    expect(db.coldArchivePurgeRun.rows.get(done.runId)!['status']).toBe('succeeded');
    expect(db.coldArchivePurgeRun.rows.get(cur.runId)!['status']).toBe('running');
  });
});

describe('PurgeJournalStore — задание', () => {
  it('задание партии: pending, attempt 0, снимок путей; повтор той же партии — то же задание', async () => {
    const { db, store } = setup();
    const { run, job } = await runWithJob(store);
    expect(job).toMatchObject({ status: 'pending', attempt: 0, batchId: 'b-1', storageRefs: ['d-1/a.wav', 'd-1/b.wav'], outcomes: {} });
    const dup = await store.addJob({ runId: run.runId, targetType: 'batch', batchId: 'b-1', storageRefs: [] });
    expect(dup.ok && dup.value).toMatchObject({ duplicate: true, job: { jobId: job.jobId } });
    expect(db.coldArchivePurgeJob.rows.size).toBe(1);
  });

  it('две сироты в прогоне (batchId NULL) — два задания; batch без batchId и сирота с batchId — отказ', async () => {
    const { db, store } = setup();
    const run = await store.openRun(OPEN, T0);
    await store.addJob({ runId: run.runId, targetType: 'orphan_blob', storageRefs: ['x'] });
    await store.addJob({ runId: run.runId, targetType: 'orphan_blob', storageRefs: ['y'] });
    expect(db.coldArchivePurgeJob.rows.size).toBe(2);
    const noBatch = await store.addJob({ runId: run.runId, targetType: 'batch', storageRefs: [] });
    const orphanWithBatch = await store.addJob({ runId: run.runId, targetType: 'orphan_blob', batchId: 'b-1', storageRefs: [] });
    expect(!noBatch.ok && noBatch.refusal.reason).toBe('invalid_job_target');
    expect(!orphanWithBatch.ok && orphanWithBatch.refusal.reason).toBe('invalid_job_target');
  });
});

describe('PurgeJournalStore — захват по лизу', () => {
  it('захват: claimed, leaseUntil = now + лиз, attempt не меняется', async () => {
    const { store } = setup();
    const { job } = await runWithJob(store);
    const claimed = await store.claimJob(job.jobId, T0, 5 * MIN);
    expect(claimed.ok && claimed.value).toMatchObject({ status: 'claimed', leaseUntil: at(5 * MIN), attempt: 0 });
  });

  it('чужой невыпущенный лиз не берётся — ни до срока, ни ровно в срок', async () => {
    const { store } = setup();
    const { job } = await runWithJob(store);
    await store.claimJob(job.jobId, T0, 5 * MIN);
    for (const now of [at(MIN), at(5 * MIN)]) {
      const second = await store.claimJob(job.jobId, now, 5 * MIN);
      expect(!second.ok && second.refusal.reason).toBe('job_not_claimable');
    }
    expect(await store.listClaimable(at(MIN), 10)).toEqual([]);
  });

  it('после истечения лиза задание перехватывается; прежний держатель исход не пишет (lease_lost)', async () => {
    const { db, store } = setup();
    const { job } = await runWithJob(store);
    const first = await store.claimJob(job.jobId, T0, 5 * MIN);
    if (!first.ok) throw new Error('first claim refused');
    expect((await store.listClaimable(at(6 * MIN), 10)).map((j) => j.jobId)).toEqual([job.jobId]);

    const second = await store.claimJob(job.jobId, at(6 * MIN), 5 * MIN);
    expect(second.ok && second.value.leaseUntil).toEqual(at(11 * MIN));

    const stale = await store.completeJob(job.jobId, first.value.leaseUntil!, SUCCEEDED, {});
    expect(!stale.ok && stale.refusal.reason).toBe('lease_lost');
    expect(db.coldArchivePurgeJob.rows.get(job.jobId)!['status']).toBe('claimed');
  });

  it('итог попытки пишется держателем: исходы по путям, байты, лиз снят; succeeded больше не берётся', async () => {
    const { store } = setup();
    const { job } = await runWithJob(store);
    const claimed = await store.claimJob(job.jobId, T0);
    if (!claimed.ok) throw new Error('claim refused');
    const outcomes = {
      'd-1/a.wav': { beforeExists: true, afterExists: false, action: 'removed' },
      'd-1/b.wav': { beforeExists: false, afterExists: false, action: 'already_absent' },
    } as const;
    const done = await store.completeJob(job.jobId, claimed.value.leaseUntil!, SUCCEEDED, outcomes);
    expect(done.ok && done.value).toMatchObject({ status: 'succeeded', attempt: 1, leaseUntil: null, bytesFreed: 300, outcomes });
    const again = await store.claimJob(job.jobId, at(60 * MIN));
    expect(!again.ok && again.refusal.reason).toBe('job_not_claimable');
  });

  it('retry берётся только с наступлением nextAttemptAt; dead_letter не берётся никогда', async () => {
    const { store } = setup();
    const { run, job } = await runWithJob(store);
    const c = await store.claimJob(job.jobId, T0);
    if (!c.ok) throw new Error('claim refused');
    await store.completeJob(job.jobId, c.value.leaseUntil!, { status: 'retry', attempt: 1, nextAttemptAt: at(60 * MIN), bytesFreed: 0, lastError: '1 путь: EBUSY' }, {});
    expect(!(await store.claimJob(job.jobId, at(59 * MIN))).ok).toBe(true);
    const due = await store.claimJob(job.jobId, at(60 * MIN));
    expect(due.ok && due.value.attempt).toBe(1);

    const orphan = await store.addJob({ runId: run.runId, targetType: 'orphan_blob', storageRefs: ['z'] });
    if (!orphan.ok) throw new Error('addJob refused');
    const oc = await store.claimJob(orphan.value.job.jobId, T0);
    if (!oc.ok) throw new Error('claim refused');
    await store.completeJob(orphan.value.job.jobId, oc.value.leaseUntil!, { status: 'dead_letter', attempt: 5, nextAttemptAt: null, bytesFreed: 0, lastError: '1 путь: EACCES' }, {});
    expect(!(await store.claimJob(orphan.value.job.jobId, at(10_000 * MIN))).ok).toBe(true);
  });

  it('исчерпанное задание (attempt >= PURGE_MAX_ATTEMPTS) не захватывается ни в каком статусе, даже до dead_letter', async () => {
    const { db, store } = setup();
    const { job } = await runWithJob(store);
    const last = PURGE_MAX_ATTEMPTS - 1;
    db.coldArchivePurgeJob.rows.set(job.jobId, { ...db.coldArchivePurgeJob.rows.get(job.jobId)!, status: 'retry', attempt: last });
    const lastTry = await store.claimJob(job.jobId, T0, 5 * MIN);
    expect(lastTry.ok && lastTry.value.attempt).toBe(last);

    for (const status of ['pending', 'retry', 'claimed'] as const) {
      db.coldArchivePurgeJob.rows.set(job.jobId, {
        ...db.coldArchivePurgeJob.rows.get(job.jobId)!,
        status,
        attempt: PURGE_MAX_ATTEMPTS,
        nextAttemptAt: null,
        leaseUntil: status === 'claimed' ? at(-MIN) : null,
      });
      const refused = await store.claimJob(job.jobId, at(60 * MIN));
      expect(!refused.ok && refused.refusal.reason).toBe('job_not_claimable');
      expect(await store.listClaimable(at(60 * MIN), 10)).toEqual([]);
    }
  });

  it('claimableWhere: pending | retry по сроку | claimed с истёкшим лизом — и ничего больше', () => {
    const now = at(10 * MIN);
    const row = (o: Partial<Row>): Row => ({ id: 'j', status: 'pending', attempt: 0, nextAttemptAt: null, leaseUntil: null, ...o });
    const w = claimableWhere(now);
    expect(matches(row({}), w)).toBe(true);
    expect(matches(row({ status: 'retry' }), w)).toBe(true);
    expect(matches(row({ status: 'retry', nextAttemptAt: at(11 * MIN) }), w)).toBe(false);
    expect(matches(row({ status: 'claimed', leaseUntil: at(9 * MIN) }), w)).toBe(true);
    expect(matches(row({ status: 'claimed', leaseUntil: at(10 * MIN) }), w)).toBe(false);
    expect(matches(row({ status: 'succeeded' }), w)).toBe(false);
    expect(matches(row({ status: 'dead_letter' }), w)).toBe(false);
    expect(matches(row({ attempt: PURGE_MAX_ATTEMPTS }), w)).toBe(false);
  });
});
