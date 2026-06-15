import { useSyncExternalStore } from 'react';

import { sampleLibraryDronePluginState } from './sampleLibraryDronePluginState';

export function useSampleLibraryDroneAnalysis() {
  return useSyncExternalStore(
    sampleLibraryDronePluginState.subscribe,
    sampleLibraryDronePluginState.getSnapshot,
    sampleLibraryDronePluginState.getSnapshot,
  );
}
