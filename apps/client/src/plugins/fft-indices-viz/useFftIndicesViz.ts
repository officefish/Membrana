import { useSyncExternalStore } from 'react';

import { fftIndicesVizPluginState } from './fftIndicesVizPluginState';

export function useFftIndicesViz() {
  return useSyncExternalStore(
    fftIndicesVizPluginState.subscribe,
    fftIndicesVizPluginState.getSnapshot,
    fftIndicesVizPluginState.getSnapshot,
  );
}
