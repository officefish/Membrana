/**
 * Хранилище журнала уборщика холодного архива (#2632 блок g1b; консилиум archive-gc-journal-2026-10-08,
 * вердикты 1, 2, 5). Пишет `ColdArchivePurgeRun` и `ColdArchivePurgeJob` (схема g1a).
 *
 * ТОЛЬКО ФОРМА ЗАПИСИ, НЕ ПОВЕДЕНИЕ. Что удалять — исполнитель g3b; как пережить отказ (попытки,
 * пауза, dead_letter, счётчики) — чистая политика g3a; доказательство по пути — `removeWithProof` g2.
 * Хранилище принимает их ответы и кладёт в БД атомарно; своих решений «повторить / сдаться» не
 * принимает.
 *
 * ПУСТОЙ ПРОГОН — ТОЖЕ СТРОКА (вердикт 5): `openRun` → `closeRun` без заданий оставляет `succeeded`
 * с нулями. Пульс g5b считает от последнего УСПЕШНОГО прогона, поэтому «ничего не было» обязано
 * отличаться от «не запускались».
 *
 * ЗАХВАТ ПО ЛИЗУ (вердикт 2). `claimJob` — один условный `updateMany`: задание берётся, только если
 * оно `pending`/`retry` и срок повтора наступил, ЛИБО `claimed`, но лиз истёк (держатель умер).
 * Чужой невыпущенный лиз не берётся. `leaseUntil` захвата — жетон: `completeJob` пишет исход только
 * при том же жетоне, поэтому держатель, у которого лиз истёк и задание перехватили, чужой исход не
 * затрёт. `attempt` захват не трогает: число попыток считает политика g3a (`decideAfterAttempt`);
 * исчерпанное по `PURGE_MAX_ATTEMPTS` задание не захватывается.
 *
 * ИДЕМПОТЕНТНОСТЬ ЗАДАНИЯ ПАРТИИ держит `UNIQUE (runId, batchId)`: повтор той же партии в прогоне
 * возвращает уже существующее задание (P2002), второго не создаёт. `orphan_blob` идёт с
 * `batchId = NULL` и уникальностью не ограничен — дедупликация долга сирот за g3b.
 */
import { Inject, Injectable } from '@nestjs/common';

import type { ColdArchivePurgeJob, ColdArchivePurgeRun, Prisma } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

import type {
  PurgeJobStatus,
  PurgeJobTarget,
  PurgePathOutcome,
  PurgeRunMode,
  PurgeRunStatus,
  PurgeRunTrigger,
} from './purge-journal.vocabulary';
import { EMPTY_RUN_COUNTERS, PURGE_MAX_ATTEMPTS, type PurgeRunCounters, type RetryTransition } from './purge-retry-policy';

/** Лиз по умолчанию: заметно больше одной партии (K партий за прогон, g3b), меньше часа метронома. */
export const PURGE_JOB_LEASE_MS = 10 * 60 * 1000;

export interface OpenRunInput {
  readonly trigger: PurgeRunTrigger;
  readonly mode: PurgeRunMode;
  /** Снимки флагов office на момент пуска (`COLD_ARCHIVE_PURGE_ENABLED` / `…_DRY_RUN`). */
  readonly enabledSnapshot: boolean;
  readonly dryRunSnapshot: boolean;
}

export interface AddJobInput {
  readonly runId: string;
  readonly targetType: PurgeJobTarget;
  /** Обязателен для `batch`, запрещён для `orphan_blob`. */
  readonly batchId?: string | null;
  readonly deviceId?: string | null;
  /** Снимок путей ДО `markPurged` (порядок live по партии). */
  readonly storageRefs: readonly string[];
}

export interface PurgeRunView {
  readonly runId: string;
  readonly trigger: PurgeRunTrigger;
  readonly mode: PurgeRunMode;
  readonly status: PurgeRunStatus;
  readonly startedAt: Date;
  readonly finishedAt: Date | null;
  readonly enabledSnapshot: boolean;
  readonly dryRunSnapshot: boolean;
  readonly counters: PurgeRunCounters;
  readonly errorSummary: string | null;
}

export interface PurgeJobView {
  readonly jobId: string;
  readonly runId: string;
  readonly targetType: PurgeJobTarget;
  readonly batchId: string | null;
  readonly deviceId: string | null;
  readonly storageRefs: readonly string[];
  readonly status: PurgeJobStatus;
  readonly attempt: number;
  readonly nextAttemptAt: Date | null;
  readonly leaseUntil: Date | null;
  readonly outcomes: Readonly<Record<string, PurgePathOutcome>>;
  readonly bytesFreed: number;
  readonly lastError: string | null;
}

export type PurgeJournalRefusalReason =
  | 'invalid_job_target'
  | 'run_not_running'
  | 'job_not_claimable'
  | 'lease_lost';

export interface PurgeJournalRefusal {
  readonly reason: PurgeJournalRefusalReason;
  readonly detail: string;
}

export type JournalResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly refusal: PurgeJournalRefusal };

const ok = <T>(value: T): JournalResult<T> => ({ ok: true, value });
const refuse = <T>(reason: PurgeJournalRefusalReason, detail: string): JournalResult<T> => ({
  ok: false,
  refusal: { reason, detail },
});

const isUniqueViolation = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && (e as { code?: string }).code === 'P2002';

function runViewOf(row: ColdArchivePurgeRun): PurgeRunView {
  return {
    runId: row.id,
    trigger: row.trigger,
    mode: row.mode,
    status: row.status,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
    enabledSnapshot: row.enabledSnapshot,
    dryRunSnapshot: row.dryRunSnapshot,
    counters: {
      jobsTotal: row.jobsTotal,
      jobsSucceeded: row.jobsSucceeded,
      jobsFailed: row.jobsFailed,
      jobsDeadLetter: row.jobsDeadLetter,
      bytesFreed: Number(row.bytesFreed),
    },
    errorSummary: row.errorSummary,
  };
}

function jobViewOf(row: ColdArchivePurgeJob): PurgeJobView {
  return {
    jobId: row.id,
    runId: row.runId,
    targetType: row.targetType,
    batchId: row.batchId,
    deviceId: row.deviceId,
    storageRefs: row.storageRefs,
    status: row.status,
    attempt: row.attempt,
    nextAttemptAt: row.nextAttemptAt,
    leaseUntil: row.leaseUntil,
    outcomes: (row.outcomes ?? {}) as unknown as Record<string, PurgePathOutcome>,
    bytesFreed: Number(row.bytesFreed),
    lastError: row.lastError,
  };
}

/**
 * Условие захвата на момент `now` — SQL-зеркало `isDue` g3a плюс перехват истёкшего лиза.
 * Исчерпанное задание (`attempt >= PURGE_MAX_ATTEMPTS`) не берётся ни в каком статусе — даже если
 * исполнитель ещё не перевёл его в `dead_letter` (например, упал между попыткой и записью итога).
 */
export function claimableWhere(now: Date): Prisma.ColdArchivePurgeJobWhereInput {
  return {
    attempt: { lt: PURGE_MAX_ATTEMPTS },
    OR: [
      { status: 'pending' },
      { AND: [{ status: 'retry' }, { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] }] },
      { AND: [{ status: 'claimed' }, { leaseUntil: { lt: now } }] },
    ],
  };
}

@Injectable()
export class PurgeJournalStore {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /** Открыть прогон: строка `running` пишется ДО первого задания — даже если заданий не будет. */
  async openRun(input: OpenRunInput, now: Date = new Date()): Promise<PurgeRunView> {
    const row = await this.prisma.coldArchivePurgeRun.create({
      data: {
        trigger: input.trigger,
        mode: input.mode,
        status: 'running',
        startedAt: now,
        enabledSnapshot: input.enabledSnapshot,
        dryRunSnapshot: input.dryRunSnapshot,
      },
    });
    return runViewOf(row);
  }

  /**
   * Закрыть прогон счётчиками (`foldRunCounters` g3a). Без заданий — нули: пустой прогон остаётся
   * строкой `succeeded`. Закрывается только `running`: прогон, уже помеченный `abandoned`, не
   * воскресает.
   */
  async closeRun(
    runId: string,
    outcome: { readonly status: Extract<PurgeRunStatus, 'succeeded' | 'failed'>; readonly counters?: PurgeRunCounters; readonly errorSummary?: string | null },
    now: Date = new Date(),
  ): Promise<JournalResult<PurgeRunView>> {
    const c = outcome.counters ?? EMPTY_RUN_COUNTERS;
    const { count } = await this.prisma.coldArchivePurgeRun.updateMany({
      where: { id: runId, status: 'running' },
      data: {
        status: outcome.status,
        finishedAt: now,
        jobsTotal: c.jobsTotal,
        jobsSucceeded: c.jobsSucceeded,
        jobsFailed: c.jobsFailed,
        jobsDeadLetter: c.jobsDeadLetter,
        bytesFreed: BigInt(c.bytesFreed),
        errorSummary: outcome.errorSummary ?? null,
      },
    });
    if (count !== 1) return refuse('run_not_running', `прогон ${runId} не в состоянии running`);
    const row = await this.prisma.coldArchivePurgeRun.findUnique({ where: { id: runId } });
    return ok(runViewOf(row!));
  }

  /**
   * На старте нового прогона: все прочие `running` — оборваны рестартом → `abandoned`. Их невзятые
   * и захваченные задания остаются в журнале и переходят к новому держателю по лизу (`claimJob`).
   */
  async markAbandoned(exceptRunId: string, now: Date = new Date()): Promise<number> {
    const { count } = await this.prisma.coldArchivePurgeRun.updateMany({
      where: { status: 'running', id: { not: exceptRunId } },
      data: { status: 'abandoned', finishedAt: now },
    });
    return count;
  }

  /** Записать задание со снимком путей. Повтор той же партии в прогоне — уже существующее задание. */
  async addJob(input: AddJobInput): Promise<JournalResult<{ readonly job: PurgeJobView; readonly duplicate: boolean }>> {
    const batchId = input.batchId ?? null;
    if ((input.targetType === 'batch') !== (batchId !== null)) {
      return refuse('invalid_job_target', `${input.targetType}: batchId ${batchId === null ? 'обязателен' : 'запрещён'}`);
    }
    try {
      const row = await this.prisma.coldArchivePurgeJob.create({
        data: {
          runId: input.runId,
          targetType: input.targetType,
          batchId,
          deviceId: input.deviceId ?? null,
          storageRefs: [...input.storageRefs],
          status: 'pending',
        },
      });
      return ok({ job: jobViewOf(row), duplicate: false });
    } catch (e) {
      if (!isUniqueViolation(e) || batchId === null) throw e;
      const existing = await this.prisma.coldArchivePurgeJob.findUnique({
        where: { runId_batchId: { runId: input.runId, batchId } },
      });
      return ok({ job: jobViewOf(existing!), duplicate: true });
    }
  }

  /** Задания, годные к захвату сейчас (кандидаты; сам захват — `claimJob`, атомарно). */
  async listClaimable(now: Date, limit: number): Promise<readonly PurgeJobView[]> {
    const rows = await this.prisma.coldArchivePurgeJob.findMany({
      where: claimableWhere(now),
      orderBy: { nextAttemptAt: { sort: 'asc', nulls: 'first' } },
      take: limit,
    });
    return rows.map(jobViewOf);
  }

  /** Захватить задание на `leaseMs`. Чужой невыпущенный лиз — отказ `job_not_claimable`. */
  async claimJob(jobId: string, now: Date = new Date(), leaseMs: number = PURGE_JOB_LEASE_MS): Promise<JournalResult<PurgeJobView>> {
    const leaseUntil = new Date(now.getTime() + leaseMs);
    const { count } = await this.prisma.coldArchivePurgeJob.updateMany({
      where: { AND: [{ id: jobId }, claimableWhere(now)] },
      data: { status: 'claimed', leaseUntil },
    });
    if (count !== 1) return refuse('job_not_claimable', `задание ${jobId} не годно к захвату на ${now.toISOString()}`);
    const row = await this.prisma.coldArchivePurgeJob.findUnique({ where: { id: jobId } });
    return ok(jobViewOf(row!));
  }

  /**
   * Записать итог попытки (`decideAfterAttempt` g3a) и исходы по путям (`removeWithProof` g2).
   * `leaseUntil` — жетон из `claimJob`: другой жетон = лиз перехвачен, исход не пишется.
   */
  async completeJob(
    jobId: string,
    leaseUntil: Date,
    transition: RetryTransition,
    outcomes: Readonly<Record<string, PurgePathOutcome>>,
  ): Promise<JournalResult<PurgeJobView>> {
    const { count } = await this.prisma.coldArchivePurgeJob.updateMany({
      where: { id: jobId, status: 'claimed', leaseUntil },
      data: {
        status: transition.status,
        attempt: transition.attempt,
        nextAttemptAt: transition.nextAttemptAt,
        leaseUntil: null,
        outcomes: outcomes as unknown as Prisma.InputJsonValue,
        bytesFreed: BigInt(transition.bytesFreed),
        lastError: transition.lastError,
      },
    });
    if (count !== 1) return refuse('lease_lost', `задание ${jobId}: лиз ${leaseUntil.toISOString()} уже не действует`);
    const row = await this.prisma.coldArchivePurgeJob.findUnique({ where: { id: jobId } });
    return ok(jobViewOf(row!));
  }
}
