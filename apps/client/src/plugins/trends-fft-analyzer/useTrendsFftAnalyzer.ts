import { useSyncExternalStore } from 'react';

import { trendsFftPluginState } from './trendsFftPluginState';

export function useTrendsFftAnalyzer(): ReturnType<
  typeof trendsFftPluginState.getSnapshot
> {
  return useSyncExternalStore(
    trendsFftPluginState.subscribe,
    trendsFftPluginState.getSnapshot,
    trendsFftPluginState.getSnapshot,
  );
}
