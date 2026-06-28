import type { UserCaseCatalogEntrySummary } from '@membrana/core';

/** Entitlement status for catalog card UI (G1 stub + competition community). */
export type UserCaseEntitlementStatus = 'bundled' | 'community' | 'entitled' | 'locked';

/** UserCase card for settings / picker UI. */
export interface UserCaseCatalogCard extends UserCaseCatalogEntrySummary {
  readonly entitlement: UserCaseEntitlementStatus;
  readonly canApply: boolean;
}
