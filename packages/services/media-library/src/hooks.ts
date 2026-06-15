import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  getDefaultMediaLibraryService,
  type MediaLibraryService,
} from './media-library-service.js';
import type { MediaLibrarySnapshot } from './types.js';

export interface UseMediaLibraryResult {
  snapshot: MediaLibrarySnapshot;
  service: MediaLibraryService;
  refresh: () => Promise<void>;
  ready: boolean;
}

export function useMediaLibrary(
  service: MediaLibraryService = getDefaultMediaLibraryService(),
): UseMediaLibraryResult {
  const subscribe = useCallback(
    (onStoreChange: () => void) => service.subscribe(onStoreChange),
    [service],
  );
  const getSnapshot = useCallback(() => service.getSnapshot(), [service]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    let active = true;
    service.init().catch((err: unknown) => {
      if (active) {
        console.error('[useMediaLibrary] init failed', err);
      }
    });
    return () => {
      active = false;
    };
  }, [service]);

  const refresh = useCallback(() => service.refresh(), [service]);

  return {
    snapshot,
    service,
    refresh,
    ready: snapshot.collections.length > 0,
  };
}
