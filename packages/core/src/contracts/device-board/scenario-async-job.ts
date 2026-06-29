/**
 * Async job contracts для scenario runtime (Promise nodes, detached I/O).
 * @see docs/prompts/DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md §AP1
 */

/** Терминальное состояние async job. */
export const SCENARIO_ASYNC_JOB_STATES = [
  'pending',
  'resolved',
  'rejected',
  'cancelled',
] as const;

export type ScenarioAsyncJobState = (typeof SCENARIO_ASYNC_JOB_STATES)[number];

/** Категория side-effect job (host bridge mapping). */
export const SCENARIO_ASYNC_JOB_KINDS = [
  'track-upload',
  'report-build',
  'journal-publish',
  'custom',
] as const;

export type ScenarioAsyncJobKind = (typeof SCENARIO_ASYNC_JOB_KINDS)[number];

/** Корреляция job с chain-log и runtime run. */
export interface ScenarioAsyncJobCorrelation {
  readonly runId: string;
  readonly branch: string;
  readonly nodeId: string;
  readonly tick?: number;
  readonly startedAtMs: number;
}

/** Snapshot async job для store / UI hub (без DOM). */
export interface ScenarioAsyncJobRecord {
  readonly promiseId: string;
  readonly kind: ScenarioAsyncJobKind;
  readonly state: ScenarioAsyncJobState;
  readonly correlation: ScenarioAsyncJobCorrelation;
  readonly resolvedAtMs?: number;
  readonly errorMessage?: string;
}

/** Default backpressure (ADR AD4). */
export const DEFAULT_MAX_PENDING_TRACK_UPLOAD_JOBS = 3;

/** Default await timeout for `await-promise` node (ms). */
export const DEFAULT_SCENARIO_ASYNC_JOB_AWAIT_TIMEOUT_MS = 30_000;

/** True, если terminal state. */
export function isTerminalScenarioAsyncJobState(state: ScenarioAsyncJobState): boolean {
  return state !== 'pending';
}

/** Type guard для `ScenarioAsyncJobKind`. */
export function isScenarioAsyncJobKind(value: string): value is ScenarioAsyncJobKind {
  return (SCENARIO_ASYNC_JOB_KINDS as readonly string[]).includes(value);
}

/** Type guard для `ScenarioAsyncJobState`. */
export function isScenarioAsyncJobState(value: string): value is ScenarioAsyncJobState {
  return (SCENARIO_ASYNC_JOB_STATES as readonly string[]).includes(value);
}
