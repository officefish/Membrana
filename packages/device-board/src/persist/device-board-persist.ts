import type { DeviceScenarioDocument } from '@membrana/core';

import type { HydratedBoardState } from '../graph/hydrate-board-from-document.js';

export interface DeviceScenarioRemoteRecord {
  readonly document: DeviceScenarioDocument;
  readonly updatedAt: string;
}

/** Адаптер загрузки/сохранения сценария (local / media-server / cabinet). */
export interface DeviceBoardPersistAdapter {
  load(): Promise<DeviceScenarioRemoteRecord | null>;
  save(document: DeviceScenarioDocument): Promise<DeviceScenarioRemoteRecord>;
}

export const DEVICE_BOARD_PERSIST_CONFLICT_CODE = 'WORKSPACE_CONFLICT' as const;

/** True when persist adapter rejected save due to stale remote version (U11 S3). */
export function isDeviceBoardPersistConflict(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === DEVICE_BOARD_PERSIST_CONFLICT_CODE
  );
}

export interface DeviceBoardPersistController {
  readonly syncStatus: 'idle' | 'loading' | 'saving' | 'error';
  readonly syncError: string | null;
  readonly syncConflict: boolean;
  readonly applyHydratedState: (state: HydratedBoardState) => void;
}
