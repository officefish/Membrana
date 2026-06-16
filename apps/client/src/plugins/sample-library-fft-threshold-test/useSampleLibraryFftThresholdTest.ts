import { useSyncExternalStore } from 'react';

import {
  sampleLibraryFftThresholdState,
  type SampleFftThresholdSnapshot,
} from './sampleLibraryFftThresholdPluginState';

export function useSampleLibraryFftThresholdTest(): SampleFftThresholdSnapshot {
  return useSyncExternalStore(
    sampleLibraryFftThresholdState.subscribe,
    sampleLibraryFftThresholdState.getSnapshot,
    sampleLibraryFftThresholdState.getSnapshot,
  );
}
