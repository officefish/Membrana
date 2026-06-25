import type { ScenarioAsyncJobRecord } from '@membrana/core';
import { isTerminalScenarioAsyncJobState } from '@membrana/core';

import type { AsyncJobStore } from './async-job-store.js';

/** Ждёт terminal state async job или timeout / abort. */
export function waitForAsyncJobTerminal(
  store: AsyncJobStore,
  promiseId: string,
  timeoutMs: number,
  signal: AbortSignal,
): Promise<ScenarioAsyncJobRecord> {
  const existing = store.get(promiseId);
  if (existing !== undefined && isTerminalScenarioAsyncJobState(existing.state)) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      unsubscribe();
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      signal.removeEventListener('abort', onAbort);
    };

    const onAbort = (): void => {
      cleanup();
      reject(new DOMException('Scenario aborted', 'AbortError'));
    };

    const unsubscribe = store.subscribe((record) => {
      if (record.promiseId !== promiseId) {
        return;
      }
      if (isTerminalScenarioAsyncJobState(record.state)) {
        cleanup();
        resolve(record);
      }
    });

    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error(`await-promise timeout after ${timeoutMs}ms (promiseId=${promiseId})`));
    }, timeoutMs);
  });
}
