import { useSyncExternalStore } from 'react';

import { fftThresholdPluginState } from './fftThresholdPluginState';

export function useFftThresholdTest(): ReturnType<
  typeof fftThresholdPluginState.getSnapshot
> {
  return useSyncExternalStore(
    fftThresholdPluginState.subscribe,
    fftThresholdPluginState.getSnapshot,
    fftThresholdPluginState.getSnapshot,
  );
}
