import { useSyncExternalStore } from 'react';

import { micLiveDronePluginState } from './micLiveDronePluginState';
import type { MicLiveDroneSnapshot } from './types';

export function useMicLiveDroneAnalysis(): MicLiveDroneSnapshot {
  return useSyncExternalStore(
    micLiveDronePluginState.subscribe,
    micLiveDronePluginState.getSnapshot,
    micLiveDronePluginState.getSnapshot,
  );
}
