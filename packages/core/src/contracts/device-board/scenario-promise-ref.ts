/**
 * PromiseRef handle conventions (async job handle на canvas dataflow).
 * @see docs/prompts/DEVICE_BOARD_ASYNC_PIPELINE_EPIC_PROMPT.md §AP1
 */

import type { ScenarioAsyncJobKind } from './scenario-async-job.js';
import { isScenarioAsyncJobKind } from './scenario-async-job.js';

/** Префикс handle для PromiseRef. */
export const PROMISE_REF_HANDLE_PREFIX = 'promise' as const;

/** Создаёт канонический handle PromiseRef. */
export function formatPromiseRefHandle(kind: ScenarioAsyncJobKind, promiseId: string): string {
  return `${PROMISE_REF_HANDLE_PREFIX}:${kind}:${promiseId}`;
}

/** Разбирает handle PromiseRef; null если формат не совпадает. */
export function parsePromiseRefHandle(
  handle: string,
): { readonly kind: ScenarioAsyncJobKind; readonly promiseId: string } | null {
  const parts = handle.split(':');
  if (parts.length < 3 || parts[0] !== PROMISE_REF_HANDLE_PREFIX) {
    return null;
  }
  const kind = parts[1];
  if (kind === undefined || !isScenarioAsyncJobKind(kind)) {
    return null;
  }
  const promiseId = parts.slice(2).join(':');
  if (promiseId.length === 0) {
    return null;
  }
  return { kind, promiseId };
}
