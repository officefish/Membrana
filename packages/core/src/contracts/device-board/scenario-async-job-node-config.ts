/**
 * Inspector config для promise/async orchestration nodes (AP v1).
 * @see docs/prompts/DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md §AP4
 */

import {
  DEFAULT_SCENARIO_ASYNC_JOB_AWAIT_TIMEOUT_MS,
  type ScenarioAsyncJobKind,
} from './scenario-async-job.js';
import { isScenarioAsyncJobKind } from './scenario-async-job.js';

/** Persisted config на узлах start-async-job / await-promise / cancel-async-jobs. */
export interface ScenarioAsyncJobNodeConfig {
  readonly jobKind: ScenarioAsyncJobKind;
  /** Таймаут для `await-promise` (ms). */
  readonly awaitTimeoutMs?: number;
}

export const DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG: ScenarioAsyncJobNodeConfig = {
  jobKind: 'track-upload',
  awaitTimeoutMs: DEFAULT_SCENARIO_ASYNC_JOB_AWAIT_TIMEOUT_MS,
};

function clampAwaitTimeoutMs(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined;
  }
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : DEFAULT_SCENARIO_ASYNC_JOB_AWAIT_TIMEOUT_MS;
}

/** Нормализует partial config после hydrate или UI. */
export function resolveScenarioAsyncJobNodeConfig(
  raw: Partial<ScenarioAsyncJobNodeConfig> | undefined | null,
): ScenarioAsyncJobNodeConfig {
  const base = DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG;
  if (raw === undefined || raw === null || typeof raw !== 'object') {
    return base;
  }
  const jobKind =
    typeof raw.jobKind === 'string' && isScenarioAsyncJobKind(raw.jobKind)
      ? raw.jobKind
      : base.jobKind;
  const awaitTimeoutMs =
    raw.awaitTimeoutMs !== undefined
      ? clampAwaitTimeoutMs(raw.awaitTimeoutMs) ?? base.awaitTimeoutMs
      : base.awaitTimeoutMs;
  return { jobKind, awaitTimeoutMs };
}

/** True, если value — валидный async job node config. */
export function isScenarioAsyncJobNodeConfig(value: unknown): value is ScenarioAsyncJobNodeConfig {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return typeof o.jobKind === 'string' && isScenarioAsyncJobKind(o.jobKind);
}
