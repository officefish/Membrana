import { apiPath } from './appMeta';

/**
 * #2632 g6a: клиент панели к журналу уборщика холодного архива — ТОЛЬКО ЧТЕНИЕ, только владельцу.
 * Ручки office g5a (`cold-archive-sweep.controller.ts`, `@OwnerAdmin`, не-owner → 404) отдают ответ
 * media g4a/g4b как есть; формы ниже повторяют `purge-journal.dto.ts` media. Адресов файлов в ответах
 * нет. Кнопок удаления нет и здесь: ни одной пишущей ручки клиент не знает.
 *
 * Исходы office различаются КОДОМ тела: 503 `media_not_configured`, 502 `media_unreachable` /
 * `media_rejected` (сбой media), 4xx media — его код (`run_not_found`, `invalid_run_id`, `invalid_limit`).
 */

const PREFIX = 'panel/admin/cold-archive';

export type PurgeRunTrigger = 'cron' | 'panel' | 'manual';
export type PurgeRunMode = 'dry_run' | 'live';
export type PurgeRunStatus = 'running' | 'succeeded' | 'failed' | 'abandoned';
export type PurgeJobTarget = 'batch' | 'orphan_blob';
/** `dead_letter` — попытки исчерпаны, долг виден в панели (Т2). */
export type PurgeJobStatus = 'pending' | 'claimed' | 'succeeded' | 'retry' | 'dead_letter';

export interface PurgeRunSummary {
  runId: string;
  trigger: PurgeRunTrigger;
  mode: PurgeRunMode;
  status: PurgeRunStatus;
  startedAt: string;
  finishedAt: string | null;
  enabledSnapshot: boolean;
  dryRunSnapshot: boolean;
  jobsTotal: number;
  jobsSucceeded: number;
  /** Неудачные попытки, оставившие долг (retry). */
  jobsFailed: number;
  jobsDeadLetter: number;
  bytesFreed: number;
  errorSummary: string | null;
}

export interface PurgeJobSummary {
  jobId: string;
  targetType: PurgeJobTarget;
  batchId: string | null;
  deviceId: string | null;
  status: PurgeJobStatus;
  attempt: number;
  nextAttemptAt: string | null;
  pathsTotal: number;
  outcomes: { removed: number; already_absent: number; failed: number };
  bytesFreed: number;
  lastError: string | null;
}

export interface PurgeRunDetail extends PurgeRunSummary {
  jobs: PurgeJobSummary[];
}

export interface PurgeJobVerification {
  jobId: string;
  targetType: PurgeJobTarget;
  batchId: string | null;
  status: PurgeJobStatus;
  batchState: string | null;
  rowsRemaining: number;
  pathsTotal: number;
  pathsRemaining: number;
  /** Существует ли каждый путь снимка сейчас — в порядке снимка, без адресов. */
  pathsExistNow: boolean[];
  /** Партия deleted, строк 0, путей 0. */
  clean: boolean;
}

export interface PurgeRunVerification {
  runId: string;
  mode: PurgeRunMode;
  status: PurgeRunStatus;
  clean: boolean;
  jobs: PurgeJobVerification[];
}

export interface PurgeScheduleRow {
  batchId: string;
  membraneId: string;
  deviceId: string;
  /** Когда партия станет кандидатом уборки. */
  expiresAt: string;
  frozenBytes: number;
}

/**
 * Пульс и режим уборщика — контракт g5b по плану v3 (`docs/sprint/cut/archive-gc-journal-2588.json`,
 * DoD g5b, Т1/Т6): `pulseOf(mode, lastSucceededRunAt, now) → disabled|ok|stale`, порог 2 ч, ответ несёт
 * режим по флагам. Ручки office ещё НЕТ (g5b не влит) — здесь только форма, вызова нет; путь и имена
 * полей сверить с g5b при его вливании.
 */
export type ColdArchiveSweepMode = 'disabled' | 'dry_run' | 'live';
export type ColdArchivePulseState = 'disabled' | 'ok' | 'stale';

export interface ColdArchivePulse {
  mode: ColdArchiveSweepMode;
  pulse: ColdArchivePulseState;
  lastFinishedRunAt: string | null;
  lastSucceededRunAt: string | null;
}

export class ColdArchiveApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'ColdArchiveApiError';
  }

  get notConfigured(): boolean {
    return this.status === 503 && this.code === 'media_not_configured';
  }
}

/** Человеческая фраза по статусу и коду office — без внутренних имён переменных. */
export function describeColdArchiveError(status: number, code: string | null): string {
  if (status === 503 && code === 'media_not_configured') return 'Связь с хранилищем записей не настроена.';
  if (status === 502) return 'Хранилище записей не отвечает — попробуйте позже.';
  if (status === 404 && code === 'run_not_found') return 'Такого прогона в журнале нет.';
  if (status === 400 && code === 'invalid_run_id') return 'Неверный номер прогона.';
  if (status === 400 && code === 'invalid_limit') return 'Неверный размер страницы журнала.';
  if (status === 404) return 'Раздел доступен только владельцу — войдите заново.';
  return `Запрос не прошёл (HTTP ${status}) — попробуйте ещё раз.`;
}

async function coldArchiveGet(path: string): Promise<unknown> {
  const res = await fetch(apiPath(`${PREFIX}/${path}`), { credentials: 'include' });
  if (!res.ok) {
    let code: string | null = null;
    try {
      const body = (await res.json()) as { code?: unknown };
      code = typeof body?.code === 'string' ? body.code : null;
    } catch {
      code = null;
    }
    throw new ColdArchiveApiError(res.status, code, describeColdArchiveError(res.status, code));
  }
  return res.json();
}

function withLimit(path: string, limit?: number): string {
  return limit ? `${path}?limit=${encodeURIComponent(String(limit))}` : path;
}

/** Последние прогоны (новые сверху). Пустой массив = «прогонов ещё не было», не «всё чисто». */
export async function fetchPurgeRuns(limit?: number): Promise<PurgeRunSummary[]> {
  const raw = await coldArchiveGet(withLimit('purge-runs', limit));
  return Array.isArray(raw) ? (raw as PurgeRunSummary[]) : [];
}

export async function fetchPurgeRun(runId: string): Promise<PurgeRunDetail> {
  const raw = (await coldArchiveGet(`purge-runs/${encodeURIComponent(runId)}`)) as PurgeRunDetail;
  return { ...raw, jobs: Array.isArray(raw?.jobs) ? raw.jobs : [] };
}

/** Аудит прогона сейчас (Т4): состояние партии, остаток строк, существование путей. */
export async function fetchPurgeRunVerification(runId: string): Promise<PurgeRunVerification> {
  const raw = (await coldArchiveGet(`purge-runs/${encodeURIComponent(runId)}/verify`)) as PurgeRunVerification;
  return { ...raw, jobs: Array.isArray(raw?.jobs) ? raw.jobs : [] };
}

/** Ближайшие удаления (Т5): замороженные партии по сроку. */
export async function fetchPurgeSchedule(limit?: number): Promise<PurgeScheduleRow[]> {
  const raw = await coldArchiveGet(withLimit('purge-schedule', limit));
  return Array.isArray(raw) ? (raw as PurgeScheduleRow[]) : [];
}
