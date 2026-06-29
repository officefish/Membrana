import { useMemo } from 'react';

import type { DeviceKind } from '@membrana/core';
import { getDefaultUserCaseCatalogService } from '@membrana/device-board';

import {
  ClientUserCaseCatalogService,
  getDefaultClientUserCaseCatalogService,
  type UserCaseCatalogCard,
} from '@membrana/usercase-catalog-service';

export interface UseUserCaseCatalogResult {
  readonly cards: readonly UserCaseCatalogCard[];
  readonly canApply: (id: string) => boolean;
}

/** React hook: bundled UserCase catalog cards (U9 C1). */
export function useUserCaseCatalog(deviceKind?: DeviceKind): UseUserCaseCatalogResult {
  const service = useMemo(
    () =>
      getDefaultClientUserCaseCatalogService({
        catalog: getDefaultUserCaseCatalogService(),
      }),
    [],
  );
  const cards = useMemo(() => service.listCards(deviceKind), [service, deviceKind]);

  return useMemo(
    () => ({
      cards,
      canApply: (id: string) => service.canApply(id, deviceKind),
    }),
    [cards, service, deviceKind],
  );
}

export type { ClientUserCaseCatalogService, UserCaseCatalogCard };
