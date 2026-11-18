/**
 * Политика повторов уборщика холодного архива (#2632 g3a; консилиум archive-gc-journal-2026-10-08,
 * вердикт 4; шторм 08.10, Т2: до 5 попыток → dead_letter, в v1 только видимость в панели).
 *
 * ЧИСТАЯ: ни Prisma, ни диска, ни часов — `now` приходит аргументом. Исполнитель (g3b) читает
 * задание, удаляет файлы (`removeWithProof`, g2), спрашивает политику «что дальше» и пишет ответ
 * в журнал (g1b). Шов «что делает» ↔ «как переживает отказ» — правка резчика (б).
 *
 * Литералы статусов и исходов совпадают со словарём журнала `purge-journal.vocabulary.ts` (g1a,
 * PR #2644). Пока g1a не в стволе, политика держит СТРУКТУРНЫЕ типы ниже — без импорта схемы;
 * переход на импорт словаря — механическая замена при g3b, равенство литералов держит
 * `purge-retry-policy.test.ts`.
 */

/** Предел попыток задания (Т2). Задание с `attempt >= PURGE_MAX_ATTEMPTS` — dead_letter. */
export const PURGE_MAX_ATTEMPTS = 5;

/** Пауза перед повтором после первой неудачи. Метроном office — раз в час (вердикт 2). */
export const PURGE_BACKOFF_BASE_MS = 60 * 60 * 1000;

/** Потолок паузы: долг не уходит дальше суток. */
export const PURGE_BACKOFF_CAP_MS = 24 * 60 * 60 * 1000;

/** Статусы задания — те же литералы, что `PURGE_JOB_STATUSES` g1a. */
export const RETRY_POLICY_JOB_STATUSES = ['pending', 'claimed', 'succeeded', 'retry', 'dead_letter'] as const;
export type RetryPolicyJobStatus = (typeof RETRY_POLICY_JOB_STATUSES)[number];

/** Исходы по пути — те же литералы, что `PURGE_PATH_ACTIONS` g1a и `BLOB_REMOVAL_ACTIONS` g2. */
export const RETRY_POLICY_PATH_ACTIONS = ['removed', 'already_absent', 'failed'] as const;
export type RetryPolicyPathAction = (typeof RETRY_POLICY_PATH_ACTIONS)[number];

/** Минимум исхода пути, который нужен политике (надмножество — `PurgePathOutcome` g1a). */
export interface RetryPolicyPathOutcome {
  readonly action: RetryPolicyPathAction;
  readonly bytesFreed?: number;
  readonly error?: string;
}

/** Минимум задания, который нужен политике. `attempt` — сколько попыток УЖЕ сделано. */
export interface RetryPolicyJob {
  readonly status: RetryPolicyJobStatus;
  readonly attempt: number;
  readonly nextAttemptAt: Date | null;
}

/** Что записать в задание после попытки. */
export interface RetryTransition {
  readonly status: Extract<RetryPolicyJobStatus, 'succeeded' | 'retry' | 'dead_letter'>;
  readonly attempt: number;
  /** Когда задание снова годно к захвату; `null` — больше не берётся (succeeded / dead_letter). */
  readonly nextAttemptAt: Date | null;
  readonly bytesFreed: number;
  /** Сводка отказа без адресов файлов: число неудачных путей и первый код. `null` у succeeded. */
  readonly lastError: string | null;
}

function assertAttempt(attempt: number): void {
  if (!Number.isInteger(attempt) || attempt < 0) {
    throw new RangeError(`purge-retry-policy: attempt must be a non-negative integer, got ${attempt}`);
  }
}

/**
 * Пауза перед попыткой номер `attempt + 1` после `attempt` неудач: base · 2^(attempt−1), не выше
 * потолка. Монотонна (не убывает) по `attempt`; `attempt = 0` → 0 (первая попытка без паузы).
 */
export function backoffMs(attempt: number): number {
  assertAttempt(attempt);
  if (attempt === 0) return 0;
  // Степень ограничена, чтобы 2^n не ушёл в Infinity при больших attempt.
  const exp = Math.min(attempt - 1, 30);
  return Math.min(PURGE_BACKOFF_BASE_MS * 2 ** exp, PURGE_BACKOFF_CAP_MS);
}

/** Попытки исчерпаны: задание уходит в dead_letter и больше не захватывается. */
export function isExhausted(attempt: number): boolean {
  assertAttempt(attempt);
  return attempt >= PURGE_MAX_ATTEMPTS;
}

/**
 * Годно ли задание к захвату сейчас. `pending` — да; `retry` — когда наступил `nextAttemptAt`
 * (нет срока = да) и попытки не исчерпаны; `claimed` решает лиз хранилища (g1b), не политика;
 * `succeeded` и `dead_letter` — никогда.
 */
export function isDue(job: RetryPolicyJob, now: Date): boolean {
  if (job.status === 'pending') return !isExhausted(job.attempt);
  if (job.status !== 'retry') return false;
  if (isExhausted(job.attempt)) return false;
  return job.nextAttemptAt === null || job.nextAttemptAt.getTime() <= now.getTime();
}

/** Сводка отказа: без путей, только число и первый код ошибки. */
function failureSummary(failed: readonly RetryPolicyPathOutcome[], total: number): string {
  const firstCode = failed.find((o) => o.error)?.error ?? 'failed';
  return `${failed.length} of ${total} paths failed; first: ${firstCode}`;
}

/**
 * Решение после одной попытки задания. Успех — все пути `removed` или `already_absent` (пустой
 * список путей = успех: удалять нечего). Хоть один `failed` — неудача попытки: `attempt + 1`;
 * достигнут предел → `dead_letter`, иначе `retry` с паузой `backoffMs(attempt + 1)`.
 *
 * Повтор задания удаляет заново ВСЕ пути снимка: уже удалённые дадут `already_absent` (g2), то
 * есть повтор идемпотентен и не требует хранить, какие пути были сняты в прошлый раз.
 */
export function decideAfterAttempt(
  job: Pick<RetryPolicyJob, 'attempt'>,
  outcomes: readonly RetryPolicyPathOutcome[],
  now: Date,
): RetryTransition {
  assertAttempt(job.attempt);
  const attempt = job.attempt + 1;
  const bytesFreed = outcomes.reduce((sum, o) => sum + (o.action === 'removed' ? (o.bytesFreed ?? 0) : 0), 0);
  const failed = outcomes.filter((o) => o.action === 'failed');
  if (failed.length === 0) {
    return { status: 'succeeded', attempt, nextAttemptAt: null, bytesFreed, lastError: null };
  }
  const lastError = failureSummary(failed, outcomes.length);
  if (isExhausted(attempt)) {
    return { status: 'dead_letter', attempt, nextAttemptAt: null, bytesFreed, lastError };
  }
  return { status: 'retry', attempt, nextAttemptAt: new Date(now.getTime() + backoffMs(attempt)), bytesFreed, lastError };
}

/** Счётчики прогона (поля `ColdArchivePurgeRun` плана: jobsTotal … bytesFreed). */
export interface PurgeRunCounters {
  readonly jobsTotal: number;
  readonly jobsSucceeded: number;
  /** Неудачные попытки, оставившие долг (`retry`). */
  readonly jobsFailed: number;
  readonly jobsDeadLetter: number;
  readonly bytesFreed: number;
}

export const EMPTY_RUN_COUNTERS: PurgeRunCounters = Object.freeze({
  jobsTotal: 0,
  jobsSucceeded: 0,
  jobsFailed: 0,
  jobsDeadLetter: 0,
  bytesFreed: 0,
});

/**
 * Сворачивание исходов заданий прогона в счётчики. Пустой список → нули (пустой прогон — тоже
 * строка, вердикт 5). Чистая и ассоциативная: `fold(a ++ b) = merge(fold(a), fold(b))`.
 */
export function foldRunCounters(transitions: readonly Pick<RetryTransition, 'status' | 'bytesFreed'>[]): PurgeRunCounters {
  return transitions.reduce<PurgeRunCounters>(
    (acc, t) => ({
      jobsTotal: acc.jobsTotal + 1,
      jobsSucceeded: acc.jobsSucceeded + (t.status === 'succeeded' ? 1 : 0),
      jobsFailed: acc.jobsFailed + (t.status === 'retry' ? 1 : 0),
      jobsDeadLetter: acc.jobsDeadLetter + (t.status === 'dead_letter' ? 1 : 0),
      bytesFreed: acc.bytesFreed + t.bytesFreed,
    }),
    EMPTY_RUN_COUNTERS,
  );
}

/** Слияние счётчиков двух частей прогона (партии обрабатываются порциями, g3b). */
export function mergeRunCounters(a: PurgeRunCounters, b: PurgeRunCounters): PurgeRunCounters {
  return {
    jobsTotal: a.jobsTotal + b.jobsTotal,
    jobsSucceeded: a.jobsSucceeded + b.jobsSucceeded,
    jobsFailed: a.jobsFailed + b.jobsFailed,
    jobsDeadLetter: a.jobsDeadLetter + b.jobsDeadLetter,
    bytesFreed: a.bytesFreed + b.bytesFreed,
  };
}
