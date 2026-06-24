import { useMemo } from 'react';

import {
  ClientUserCaseCatalogService,
  getDefaultClientUserCaseCatalogService,
} from './service.js';
import type { ClientUserCaseCatalogServiceOptions } from './service.js';

/**
 * Memoized {@link ClientUserCaseCatalogService} for React trees.
 * Pass stable `options` or a custom factory to avoid recreating the service each render.
 */
export function useClientUserCaseCatalogService(
  options?: ClientUserCaseCatalogServiceOptions,
): ClientUserCaseCatalogService {
  return useMemo(
    () =>
      options === undefined
        ? getDefaultClientUserCaseCatalogService()
        : new ClientUserCaseCatalogService(options),
    [options],
  );
}
