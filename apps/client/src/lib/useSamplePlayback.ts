import { useSyncExternalStore } from 'react';

import {
  getSamplePlaybackSnapshot,
  subscribeSamplePlayback,
  type SamplePlaybackSnapshot,
} from './sampleLibraryPlaybackHub';

export function useSamplePlayback(): SamplePlaybackSnapshot {
  return useSyncExternalStore(
    subscribeSamplePlayback,
    getSamplePlaybackSnapshot,
    getSamplePlaybackSnapshot,
  );
}
