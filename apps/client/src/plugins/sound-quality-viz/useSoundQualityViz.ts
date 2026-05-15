import { useSyncExternalStore } from 'react';

import { soundQualityVizPluginState } from './soundQualityVizPluginState';

export function useSoundQualityViz() {
  return useSyncExternalStore(
    soundQualityVizPluginState.subscribe,
    soundQualityVizPluginState.getSnapshot,
    soundQualityVizPluginState.getSnapshot,
  );
}
