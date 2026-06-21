import type { DeviceKind } from '@membrana/core';

/** Источник поставки UserCase (U9). */
export type UserCaseTier = 'bundled' | 'tariff' | 'community';

/** Профиль layout canon, применяемый при apply/build. */
export type UserCaseLayoutProfile = 'exec-lr-v1';

/** Карточка каталога (без loader document). */
export interface UserCaseCatalogEntrySummary {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly deviceKind: DeviceKind;
  readonly tier: UserCaseTier;
  readonly tariffSku?: string;
  readonly layoutProfile: UserCaseLayoutProfile;
  readonly branchCount: number;
  readonly functionCount: number;
  readonly preview?: {
    readonly branchStats?: Readonly<
      Record<string, { readonly nodeCount: number; readonly edgeCount: number }>
    >;
  };
}

/** Полная запись каталога с lazy loader embedded document. */
export interface UserCaseCatalogEntry extends UserCaseCatalogEntrySummary {
  readonly loadDocument: () => import('@membrana/core').DeviceScenarioDocument;
}
