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

export interface DeviceBoardPersistController {
  readonly syncStatus: 'idle' | 'loading' | 'saving' | 'saved' | 'error';
  readonly syncError: string | null;
  readonly applyHydratedState: (state: HydratedBoardState) => void;
}
