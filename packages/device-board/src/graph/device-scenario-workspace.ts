import type { DeviceScenarioDocument } from '@membrana/core';

import {
  isLegacyHackathonDefaultScenario,
  needsBundledV09FunctionsMigration,
  needsBundledV20AsyncMigration,
  needsFftTrendsPolicyConstructorMigration,
  needsRecordingGateBootstrapMigration,
} from './default-usercase-mvp-microphone.js';

/** Документ явно сохранён оператором (P0 migrate guard). */
export function isUserOwnedDeviceScenarioDocument(document: DeviceScenarioDocument): boolean {
  return document.meta?.workspaceKind === 'user';
}

/**
 * Нужно ли подменить microphone-сценарий bundled MVP при load.
 * User-owned документы не трогаем.
 */
export function shouldMigrateMicrophoneScenarioToBundledMvp(
  document: DeviceScenarioDocument,
): boolean {
  if (document.deviceKind !== 'microphone') {
    return false;
  }
  if (isUserOwnedDeviceScenarioDocument(document)) {
    return false;
  }
  return (
    isLegacyHackathonDefaultScenario(document) ||
    needsBundledV09FunctionsMigration(document) ||
    needsBundledV20AsyncMigration(document) ||
    needsRecordingGateBootstrapMigration(document) ||
    needsFftTrendsPolicyConstructorMigration(document)
  );
}

/** Помечает документ как user workspace перед persist. */
export function stampUserWorkspaceDocument(document: DeviceScenarioDocument): DeviceScenarioDocument {
  return {
    ...document,
    meta: {
      ...document.meta,
      workspaceKind: 'user',
    },
  };
}

/** Помечает документ как системный preview (read-only на доске). */
export function stampSystemPreviewDocument(
  document: DeviceScenarioDocument,
  title?: string,
): DeviceScenarioDocument {
  const trimmedTitle = title?.trim();
  return {
    ...document,
    meta: {
      ...document.meta,
      workspaceKind: 'system',
      ...(trimmedTitle !== undefined && trimmedTitle.length > 0 ? { title: trimmedTitle } : {}),
    },
  };
}
