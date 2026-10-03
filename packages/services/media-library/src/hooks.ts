import { useCallback, useEffect, useSyncExternalStore } from 'react';

import {
  getDefaultMediaLibraryService,
  subscribeDefaultMediaLibraryService,
  type MediaLibraryService,
} from './media-library-service.js';
import type { MediaLibrarySnapshot } from './types.js';

export interface UseMediaLibraryResult {
  snapshot: MediaLibrarySnapshot;
  service: MediaLibraryService;
  refresh: () => Promise<void>;
  ready: boolean;
}

/**
 * Без аргумента хук следит за default-сервисом и его ПОДМЕНОЙ (#2570): мост ставит серверный сервис
 * после пинга media, и до этого подписчик оставался на временном ленивом сервисе до случайного
 * ререндера. С явным сервисом (кабинет) поведение прежнее.
 */
export function useMediaLibrary(explicitService?: MediaLibraryService): UseMediaLibraryResult {
  const defaultService = useSyncExternalStore(
    subscribeDefaultMediaLibraryService,
    getDefaultMediaLibraryService,
    getDefaultMediaLibraryService,
  );
  const service = explicitService ?? defaultService;
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
