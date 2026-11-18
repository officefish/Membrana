/**
 * Чтение журнала уборщика и аудит прогона (#2632 блок g4; шторм 08.10, Т4 и Т5; консилиум
 * archive-gc-journal-2026-10-08, вердикт 7: панель office — только чтение).
 *
 * НАРУЖУ — ТОЛЬКО СЧЁТЧИКИ, ID И БУЛЕВЫ ПРИЗНАКИ. Адресов файлов (`storageRefs`, ключи `outcomes`) ни
 * одна функция не отдаёт: задание показывает число путей и разбивку исходов, аудит — по пути только
 * «существует ли сейчас» в порядке снимка. Тексты ошибок (`lastError`, `errorSummary`) путей не
 * содержат по построению (политика g3a, исполнитель g3b).
 *
 * - `listRuns` / `getRun` — журнал прогонов и задания прогона;
 * - `purgePulse` — последний завершённый и последний успешный прогон (пульс g5b);
 * - `purgeSchedule` (Т5) — `frozen`-партии по сроку: что и когда уйдёт;
 * - `verifyRun` (Т4) — аудит СЕЙЧАС, а не по записи журнала: состояние партии, остаток строк архива,
 *   повторная проверка существования каждого пути снимка. Не смог посмотреть ≠ файла нет: ошибка
 *   наблюдения считается присутствием (как в g2).
 */
import { nodeBlobRemovalFs, type BlobStorageService } from '../../blob/blob-storage.service';
import type { PrismaService } from '../../prisma/prisma.service';

import { PURGE_PATH_ACTIONS, type PurgePathAction, type PurgePathOutcome } from './purge-journal.vocabulary';

/** Есть ли файл по адресу снимка сейчас. */
export type BlobExistsProbe = (storageRef: string) => Promise<boolean>;

export function blobExistsProbe(blobs: Pick<BlobStorageService, 'resolvePath'>): BlobExistsProbe {
  return async (storageRef) => {
    try {
      return (await nodeBlobRemovalFs.stat(blobs.resolvePath(storageRef))) !== null;
    } catch {
      return true;
    }
  };
}

type Db = Pick<PrismaService, 'coldArchivePurgeRun' | 'coldArchivePurgeJob' | 'downgradeArchiveBatch' | 'downgradeArchivedSample'>;

type RunRow = Awaited<ReturnType<PrismaService['coldArchivePurgeRun']['findFirstOrThrow']>>;
type JobRow = Awaited<ReturnType<PrismaService['coldArchivePurgeJob']['findFirstOrThrow']>>;

function runView(r: RunRow) {
  return {
    runId: r.id,
    trigger: r.trigger,
    mode: r.mode,
    status: r.status,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    enabledSnapshot: r.enabledSnapshot,
    dryRunSnapshot: r.dryRunSnapshot,
    jobsTotal: r.jobsTotal,
    jobsSucceeded: r.jobsSucceeded,
    jobsFailed: r.jobsFailed,
    jobsDeadLetter: r.jobsDeadLetter,
    bytesFreed: Number(r.bytesFreed),
    errorSummary: r.errorSummary,
  };
}
export type PurgeRunSummary = ReturnType<typeof runView>;

function jobView(j: JobRow) {
  const outcomes = Object.values((j.outcomes ?? {}) as unknown as Record<string, PurgePathOutcome>);
  const count = (a: PurgePathAction) => outcomes.filter((o) => o.action === a).length;
  return {
    jobId: j.id,
    targetType: j.targetType,
    batchId: j.batchId,
    deviceId: j.deviceId,
    status: j.status,
    attempt: j.attempt,
    nextAttemptAt: j.nextAttemptAt,
    pathsTotal: j.storageRefs.length,
    outcomes: Object.fromEntries(PURGE_PATH_ACTIONS.map((a) => [a, count(a)])) as Record<PurgePathAction, number>,
    bytesFreed: Number(j.bytesFreed),
    lastError: j.lastError,
  };
}
export type PurgeJobSummary = ReturnType<typeof jobView>;

export async function listRuns(db: Db, limit: number): Promise<PurgeRunSummary[]> {
  const rows = await db.coldArchivePurgeRun.findMany({ orderBy: { startedAt: 'desc' }, take: limit });
  return rows.map(runView);
}

export async function getRun(db: Db, runId: string): Promise<(PurgeRunSummary & { jobs: PurgeJobSummary[] }) | null> {
  const run = await db.coldArchivePurgeRun.findUnique({ where: { id: runId } });
  if (!run) return null;
  const jobs = await db.coldArchivePurgeJob.findMany({ where: { runId }, orderBy: { id: 'asc' } });
  return { ...runView(run), jobs: jobs.map(jobView) };
}

export async function purgePulse(db: Db): Promise<{ lastFinishedRunAt: Date | null; lastSucceededRunAt: Date | null }> {
  const last = (status?: 'succeeded') =>
    db.coldArchivePurgeRun.findFirst({
      where: { finishedAt: { not: null }, ...(status ? { status } : {}) },
      orderBy: { finishedAt: 'desc' },
      select: { finishedAt: true },
    });
  const [finished, succeeded] = await Promise.all([last(), last('succeeded')]);
  return { lastFinishedRunAt: finished?.finishedAt ?? null, lastSucceededRunAt: succeeded?.finishedAt ?? null };
}

export async function purgeSchedule(db: Db, limit: number) {
  const rows = await db.downgradeArchiveBatch.findMany({
    where: { state: 'frozen' },
    orderBy: { expiresAt: 'asc' },
    take: limit,
    select: { id: true, membraneId: true, deviceId: true, expiresAt: true, frozenBytes: true },
  });
  return rows.map((b) => ({ batchId: b.id, membraneId: b.membraneId, deviceId: b.deviceId, expiresAt: b.expiresAt, frozenBytes: Number(b.frozenBytes) }));
}
export type PurgeScheduleRow = Awaited<ReturnType<typeof purgeSchedule>>[number];

export async function verifyRun(db: Db, exists: BlobExistsProbe, runId: string) {
  const run = await db.coldArchivePurgeRun.findUnique({ where: { id: runId }, select: { id: true, mode: true, status: true } });
  if (!run) return null;
  const jobs = await db.coldArchivePurgeJob.findMany({ where: { runId }, orderBy: { id: 'asc' } });
  const verified = [];
  for (const j of jobs) {
    const batch = j.batchId ? await db.downgradeArchiveBatch.findUnique({ where: { id: j.batchId }, select: { state: true } }) : null;
    const rowsRemaining = j.batchId ? await db.downgradeArchivedSample.count({ where: { batchId: j.batchId } }) : 0;
    const pathsExistNow: boolean[] = [];
    for (const ref of j.storageRefs) pathsExistNow.push(await exists(ref));
    const pathsRemaining = pathsExistNow.filter(Boolean).length;
    const batchGone = j.targetType !== 'batch' || (batch?.state === 'deleted' && rowsRemaining === 0);
    verified.push({ jobId: j.id, targetType: j.targetType, batchId: j.batchId, status: j.status, batchState: batch?.state ?? null, rowsRemaining, pathsTotal: pathsExistNow.length, pathsRemaining, pathsExistNow, clean: batchGone && pathsRemaining === 0 });
  }
  return { runId: run.id, mode: run.mode, status: run.status, clean: verified.every((v) => v.clean), jobs: verified };
}
export type PurgeRunVerification = NonNullable<Awaited<ReturnType<typeof verifyRun>>>;
