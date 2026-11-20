/**
 * Чтение журнала уборщика (#2632 блок g4a; консилиум archive-gc-journal-2026-10-08, вердикт 7: панель
 * office — только чтение): журнал прогонов, задания прогона, пульс.
 *
 * НАРУЖУ — ТОЛЬКО СЧЁТЧИКИ, ID И БУЛЕВЫ ПРИЗНАКИ. Адресов файлов (`storageRefs`, ключи `outcomes`) ни
 * одна функция не отдаёт: задание показывает число путей и разбивку исходов. Тексты ошибок
 * (`lastError`, `errorSummary`) путей не содержат по построению (политика g3a, исполнитель g3b).
 *
 * - `listRuns` / `getRun` — журнал прогонов и задания прогона;
 * - `purgePulse` — последний завершённый и последний успешный прогон ПО РАСПИСАНИЮ (пульс g5b).
 *   #2690 (решение владельца 20.11): считаются только `trigger=cron`. Пробный прогон из панели
 *   (`panel`) и ручной (`manual`) пишутся в журнал, но пульс не освежают — иначе свежее превью
 *   скрыло бы остановившееся расписание.
 *
 * График удалений (Т5) и аудит прогона (Т4) — блок g4b.
 */
import type { PrismaService } from '../../prisma/prisma.service';

import { PURGE_PATH_ACTIONS, type PurgePathAction, type PurgePathOutcome } from './purge-journal.vocabulary';

/** Таблицы, которые читают двери журнала (g4a) и аудита (g4b). */
export type PurgeJournalDb = Pick<PrismaService, 'coldArchivePurgeRun' | 'coldArchivePurgeJob' | 'downgradeArchiveBatch' | 'downgradeArchivedSample'>;

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

export async function listRuns(db: PurgeJournalDb, limit: number): Promise<PurgeRunSummary[]> {
  const rows = await db.coldArchivePurgeRun.findMany({ orderBy: { startedAt: 'desc' }, take: limit });
  return rows.map(runView);
}

export async function getRun(db: PurgeJournalDb, runId: string): Promise<(PurgeRunSummary & { jobs: PurgeJobSummary[] }) | null> {
  const run = await db.coldArchivePurgeRun.findUnique({ where: { id: runId } });
  if (!run) return null;
  const jobs = await db.coldArchivePurgeJob.findMany({ where: { runId }, orderBy: { id: 'asc' } });
  return { ...runView(run), jobs: jobs.map(jobView) };
}

/** Пульс — только прогоны по расписанию (#2690). */
export const PULSE_TRIGGER = 'cron' as const;

export async function purgePulse(db: PurgeJournalDb): Promise<{ lastFinishedRunAt: Date | null; lastSucceededRunAt: Date | null }> {
  const last = (status?: 'succeeded') =>
    db.coldArchivePurgeRun.findFirst({
      where: { trigger: PULSE_TRIGGER, finishedAt: { not: null }, ...(status ? { status } : {}) },
      orderBy: { finishedAt: 'desc' },
      select: { finishedAt: true },
    });
  const [finished, succeeded] = await Promise.all([last(), last('succeeded')]);
  return { lastFinishedRunAt: finished?.finishedAt ?? null, lastSucceededRunAt: succeeded?.finishedAt ?? null };
}
