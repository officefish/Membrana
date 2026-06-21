import type { DeviceKind, DeviceScenarioDocument } from '@membrana/core';

/** Карточка UserCase для modal picker (U9 P1). */
export interface UserCasePickerCard {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly deviceKind: DeviceKind;
  readonly branchCount: number;
  readonly functionCount: number;
  readonly entitlement: 'bundled' | 'community' | 'entitled' | 'locked';
  readonly canApply: boolean;
}

/** Конфиг picker из client (catalog + entitlement). */
export interface DeviceBoardUserCasePickerConfig {
  readonly cards: readonly UserCasePickerCard[];
  readonly loadDocument: (id: string) => DeviceScenarioDocument | null;
}
