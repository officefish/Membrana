import { useSyncExternalStore } from 'react';

import type { ScenarioAsyncJobHub, ScenarioAsyncJobHubSnapshot } from './scenario-async-job-hub.js';

/** React hook: pending async jobs badge / debug UI (AP v1 R10). */
export function useScenarioAsyncJobSnapshot(hub: ScenarioAsyncJobHub): ScenarioAsyncJobHubSnapshot {
  return useSyncExternalStore(
    (listener) => hub.subscribeSnapshot(listener),
    () => hub.getSnapshot(),
    () => hub.getSnapshot(),
  );
}
