import type { DeviceKind } from './device-kind.js';

/** Source/entitlement class of a UserCase catalog entry. */
export type UserCaseTier = 'bundled' | 'tariff' | 'community';

/** Canonical layout profile applied while building a UserCase. */
export type UserCaseLayoutProfile = 'exec-lr-v1';

/** Runtime-neutral catalog card shared by producers and entitlement consumers. */
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
