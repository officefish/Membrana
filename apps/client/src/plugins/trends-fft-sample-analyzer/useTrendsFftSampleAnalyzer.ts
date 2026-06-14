import { useSyncExternalStore } from 'react';

import { trendsFftSamplePluginState } from './trendsFftSamplePluginState';

export function useTrendsFftSampleAnalyzer() {
  return useSyncExternalStore(
    trendsFftSamplePluginState.subscribe,
    trendsFftSamplePluginState.getSnapshot,
    trendsFftSamplePluginState.getSnapshot,
  );
}
