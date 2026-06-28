import type { UserCaseCatalogEntrySummary } from '@membrana/core';

export type {
  UserCaseCatalogEntrySummary,
  UserCaseLayoutProfile,
  UserCaseTier,
} from '@membrana/core';

/** Полная запись каталога с lazy loader embedded document. */
export interface UserCaseCatalogEntry extends UserCaseCatalogEntrySummary {
  readonly loadDocument: () => import('@membrana/core').DeviceScenarioDocument;
}
