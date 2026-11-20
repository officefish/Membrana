/**
 * Зубы чтения журнала (#2632 g4a): журнал прогонов, задания прогона, пульс. Таблицы в памяти.
 * Главный зуб: адреса файлов снимка не уходят наружу (JSON ответа не содержит ни одного пути).
 */
import { describe, expect, it } from 'vitest';

import { getRun, listRuns, purgePulse } from './purge-journal-read';

const at = (h: number): Date => new Date(Date.UTC(2026, 10, 18, h));
const REFS = ['dev/secret-a.wav', 'dev/secret-b.wav'];
type Row = Record<string, unknown> & { id: string };

function fixture() {
  const runs: Row[] = [
    { id: 'r-old', trigger: 'cron', mode: 'live', status: 'succeeded', startedAt: at(1), finishedAt: at(2), enabledSnapshot: true, dryRunSnapshot: false, jobsTotal: 1, jobsSucceeded: 1, jobsFailed: 0, jobsDeadLetter: 0, bytesFreed: 10n, errorSummary: null },
    { id: 'r-new', trigger: 'panel', mode: 'live', status: 'failed', startedAt: at(5), finishedAt: at(6), enabledSnapshot: true, dryRunSnapshot: false, jobsTotal: 2, jobsSucceeded: 1, jobsFailed: 1, jobsDeadLetter: 0, bytesFreed: 5n, errorSummary: 'TypeError' },
    { id: 'r-run', trigger: 'cron', mode: 'dry_run', status: 'running', startedAt: at(7), finishedAt: null, enabledSnapshot: true, dryRunSnapshot: true, jobsTotal: 0, jobsSucceeded: 0, jobsFailed: 0, jobsDeadLetter: 0, bytesFreed: 0n, errorSummary: null },
  ];
  const jobs: Row[] = [
    { id: 'j-1', runId: 'r-new', targetType: 'batch', batchId: 'b-del', deviceId: 'dev', storageRefs: REFS, status: 'retry', attempt: 1, nextAttemptAt: at(7), bytesFreed: 5n, lastError: '1 of 2 paths failed; first: rm:EACCES', outcomes: { [REFS[0]!]: { beforeExists: true, afterExists: false, action: 'removed' }, [REFS[1]!]: { beforeExists: true, afterExists: true, action: 'failed' } } },
    { id: 'j-2', runId: 'r-new', targetType: 'batch', batchId: 'b-back', deviceId: 'dev', storageRefs: ['dev/secret-c.wav'], status: 'succeeded', attempt: 1, nextAttemptAt: null, bytesFreed: 0n, lastError: null, outcomes: {} },
    { id: 'j-3', runId: 'r-old', targetType: 'orphan_blob', batchId: null, deviceId: null, storageRefs: ['dev/secret-d.wav'], status: 'succeeded', attempt: 1, nextAttemptAt: null, bytesFreed: 10n, lastError: null, outcomes: { 'dev/secret-d.wav': { beforeExists: true, afterExists: false, action: 'removed' } } },
  ];

  const pick = (r: Row, select?: Record<string, boolean>) => (select ? Object.fromEntries(Object.keys(select).map((k) => [k, r[k]])) : { ...r });
  const sortBy = (rows: Row[], orderBy?: Record<string, 'asc' | 'desc'>) => {
    if (!orderBy) return rows;
    const [k, dir] = Object.entries(orderBy)[0]!;
    const v = (r: Row) => (r[k] instanceof Date ? (r[k] as Date).getTime() : String(r[k]));
    return [...rows].sort((a, b) => (v(a) < v(b) ? -1 : v(a) > v(b) ? 1 : 0) * (dir === 'desc' ? -1 : 1));
  };
  const matches = (r: Row, where: Record<string, unknown> = {}) =>
    Object.entries(where).every(([k, v]) => {
      if (v && typeof v === 'object' && 'not' in v) return r[k] !== (v as { not: unknown }).not;
      if (v && typeof v === 'object' && 'in' in v) return (v as { in: unknown[] }).in.includes(r[k]);
      return r[k] === v;
    });
  const table = (rows: Row[]) => ({
    findMany: async (a: { where?: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'>; take?: number; select?: Record<string, boolean> } = {}) =>
      sortBy(rows.filter((r) => matches(r, a.where)), a.orderBy).slice(0, a.take).map((r) => pick(r, a.select)),
    findUnique: async (a: { where: { id: string }; select?: Record<string, boolean> }) => {
      const r = rows.find((x) => x.id === a.where.id);
      return r ? pick(r, a.select) : null;
    },
    findFirst: async (a: { where?: Record<string, unknown>; orderBy?: Record<string, 'asc' | 'desc'>; select?: Record<string, boolean> }) => {
      const r = sortBy(rows.filter((x) => matches(x, a.where)), a.orderBy)[0];
      return r ? pick(r, a.select) : null;
    },
  });
  const db = { coldArchivePurgeRun: table(runs), coldArchivePurgeJob: table(jobs) } as never;
  return { db, runs };
}

const noPaths = (value: unknown) => expect(JSON.stringify(value)).not.toMatch(/secret-/);

describe('журнал прогонов', () => {
  it('listRuns: новые первыми, limit соблюдается, bytesFreed — число', async () => {
    const { db } = fixture();
    const runs = await listRuns(db, 2);
    expect(runs.map((r) => r.runId)).toEqual(['r-run', 'r-new']);
    expect(runs[1]).toMatchObject({ trigger: 'panel', status: 'failed', jobsFailed: 1, bytesFreed: 5, errorSummary: 'TypeError' });
    noPaths(runs);
  });

  it('getRun: задания с числом путей и разбивкой исходов — без самих путей; незнакомый прогон → null', async () => {
    const { db } = fixture();
    const run = await getRun(db, 'r-new');
    expect(run?.jobs.map((j) => [j.jobId, j.pathsTotal, j.outcomes])).toEqual([
      ['j-1', 2, { removed: 1, already_absent: 0, failed: 1 }],
      ['j-2', 1, { removed: 0, already_absent: 0, failed: 0 }],
    ]);
    noPaths(run);
    expect(await getRun(db, 'r-none')).toBeNull();
  });

  it('purgePulse: только прогоны по расписанию (cron) — последний завершённый и последний успешный; running не считается', async () => {
    const { db } = fixture();
    // r-new (panel, failed, at 6) — не по расписанию: пульс его не видит (#2690)
    expect(await purgePulse(db)).toEqual({ lastFinishedRunAt: at(2), lastSucceededRunAt: at(2) });
  });

  it('#2690: превью из панели свежее, cron старше 2 ч → пульс отдаёт время cron (office: stale)', async () => {
    const { db, runs } = fixture();
    for (const trigger of ['panel', 'manual']) {
      runs.push({ id: `r-${trigger}`, trigger, mode: 'dry_run', status: 'succeeded', startedAt: at(9), finishedAt: at(10), enabledSnapshot: false, dryRunSnapshot: true, jobsTotal: 0, jobsSucceeded: 0, jobsFailed: 0, jobsDeadLetter: 0, bytesFreed: 0n, errorSummary: null });
    }
    const pulse = await purgePulse(db);
    expect(pulse).toEqual({ lastFinishedRunAt: at(2), lastSucceededRunAt: at(2) });
    // порог office (> 2 ч, cold-archive-pulse.ts): на момент at(10) успех cron 8 ч назад — тревога
    expect(at(10).getTime() - pulse.lastSucceededRunAt!.getTime()).toBeGreaterThan(2 * 60 * 60 * 1000);
  });
});
