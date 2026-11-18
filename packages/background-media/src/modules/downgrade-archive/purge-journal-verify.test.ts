/**
 * Зубы чтения журнала и аудита прогона (#2632 g4; Т4, Т5). Таблицы в памяти; диск — подставной
 * зонд. Главный общий зуб: адреса файлов снимка не уходят наружу ни одной дверью (JSON ответа не
 * содержит ни одного пути).
 */
import { describe, expect, it } from 'vitest';

import { blobExistsProbe, getRun, listRuns, purgePulse, purgeSchedule, verifyRun } from './purge-journal-verify';

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
  const batches: Row[] = [
    { id: 'b-del', state: 'deleted', membraneId: 'm', deviceId: 'dev', expiresAt: at(0), frozenBytes: 10n },
    { id: 'b-back', state: 'restored', membraneId: 'm', deviceId: 'dev', expiresAt: at(0), frozenBytes: 3n },
    { id: 'b-late', state: 'frozen', membraneId: 'm2', deviceId: 'dev2', expiresAt: at(30), frozenBytes: 7n },
    { id: 'b-soon', state: 'frozen', membraneId: 'm1', deviceId: 'dev1', expiresAt: at(20), frozenBytes: 5n },
  ];
  const samples: Row[] = [{ id: 's-1', batchId: 'b-back' }];
  const disk = new Set(['dev/secret-b.wav', 'dev/secret-c.wav']);

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
    count: async (a: { where?: Record<string, unknown> }) => rows.filter((r) => matches(r, a.where)).length,
  });
  const db = { coldArchivePurgeRun: table(runs), coldArchivePurgeJob: table(jobs), downgradeArchiveBatch: table(batches), downgradeArchivedSample: table(samples) } as never;
  return { db, disk, exists: async (ref: string) => disk.has(ref) };
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

  it('purgePulse: последний завершённый (любой исход) и последний успешный; running не считается', async () => {
    const { db } = fixture();
    expect(await purgePulse(db)).toEqual({ lastFinishedRunAt: at(6), lastSucceededRunAt: at(2) });
  });
});

describe('Т5 — график удалений', () => {
  it('только frozen, по сроку, ровно поля batchId/membraneId/deviceId/expiresAt/frozenBytes', async () => {
    const { db } = fixture();
    expect(await purgeSchedule(db, 20)).toEqual([
      { batchId: 'b-soon', membraneId: 'm1', deviceId: 'dev1', expiresAt: at(20), frozenBytes: 5 },
      { batchId: 'b-late', membraneId: 'm2', deviceId: 'dev2', expiresAt: at(30), frozenBytes: 7 },
    ]);
    expect(await purgeSchedule(db, 1)).toHaveLength(1);
  });
});

describe('Т4 — аудит прогона сейчас', () => {
  it('по каждому заданию: состояние партии, остаток строк, существование каждого пути — булевыми, без адресов', async () => {
    const { db, disk, exists } = fixture();
    const v = await verifyRun(db, exists, 'r-new');
    expect(v).toMatchObject({ runId: 'r-new', clean: false });
    expect(v!.jobs).toEqual([
      expect.objectContaining({ jobId: 'j-1', batchState: 'deleted', rowsRemaining: 0, pathsTotal: 2, pathsRemaining: 1, pathsExistNow: [false, true], clean: false }),
      expect.objectContaining({ jobId: 'j-2', batchState: 'restored', rowsRemaining: 1, pathsExistNow: [true], clean: false }),
    ]);
    noPaths(v);

    // аудит — по диску СЕЙЧАС, а не по записи журнала: файл добран → чисто, хотя задание всё ещё retry
    disk.delete('dev/secret-b.wav');
    expect((await verifyRun(db, exists, 'r-new'))!.jobs[0]).toMatchObject({ status: 'retry', pathsExistNow: [false, false], clean: true });

    // файлов нет, но партия restored и строки на месте — не «чисто»: аудит судит и базу, не только диск
    disk.delete('dev/secret-c.wav');
    expect((await verifyRun(db, exists, 'r-new'))!.jobs[1]).toMatchObject({ batchState: 'restored', rowsRemaining: 1, pathsRemaining: 0, clean: false });
  });

  it('сирота без партии: чисто, когда пути нет; незнакомый прогон → null', async () => {
    const { db, exists } = fixture();
    const v = await verifyRun(db, exists, 'r-old');
    expect(v).toMatchObject({ clean: true, jobs: [expect.objectContaining({ targetType: 'orphan_blob', batchState: null, rowsRemaining: 0, pathsExistNow: [false] })] });
    expect(await verifyRun(db, exists, 'r-none')).toBeNull();
  });

  it('зонд диска: не смог посмотреть ≠ файла нет — ошибка наблюдения считается присутствием', async () => {
    const probe = blobExistsProbe({
      resolvePath: () => {
        throw new Error('Invalid storageRef path');
      },
    });
    expect(await probe('../../etc/passwd')).toBe(true);
    expect(await blobExistsProbe({ resolvePath: () => `${__dirname}/no-such-file-${Date.now()}.wav` })('x')).toBe(false);
    expect(await blobExistsProbe({ resolvePath: () => __filename })('x')).toBe(true);
  });
});
