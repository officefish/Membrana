import { useEffect, useState } from 'react';
import {
  createBrowserLimitedStorageBackend,
  createMediaLibraryService,
  useMediaLibrary,
  type MediaLibraryService,
  type UseMediaLibraryResult,
} from '@membrana/media-library-service';

import { getCabinetMediaLibrary } from './cabinetMediaLibrary';

const idleService = createMediaLibraryService(createBrowserLimitedStorageBackend(1));

export interface UseCabinetMediaLibraryResult extends UseMediaLibraryResult {
  loading: boolean;
  loadError: string | null;
  active: boolean;
}

export function useCabinetMediaLibrary(
  deviceId: string | null,
  reloadNonce = 0,
): UseCabinetMediaLibraryResult {
  const [service, setService] = useState<MediaLibraryService>(idleService);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!deviceId) {
      setService(idleService);
      setLoadError(null);
      setActive(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setActive(false);

    void getCabinetMediaLibrary(deviceId)
      .then((svc) => {
        if (!cancelled) {
          setService(svc);
          setActive(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
          setService(idleService);
          setActive(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [deviceId, reloadNonce]);

  const lib = useMediaLibrary(service);

  return {
    ...lib,
    loading,
    loadError,
    active,
  };
}
