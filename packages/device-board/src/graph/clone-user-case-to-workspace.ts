import type { DeviceScenarioDocument } from '@membrana/core';

import { stampUserWorkspaceDocument } from './device-scenario-workspace.js';

export interface CloneUserCaseToWorkspaceInput {
  readonly sourceDocument: DeviceScenarioDocument;
  readonly userCaseId: string;
  readonly workspaceId: string;
  readonly title?: string;
}

/** Deep copy JSON-документа сценария (без мутации каталога). */
export function deepCopyDeviceScenarioDocument(
  document: DeviceScenarioDocument,
): DeviceScenarioDocument {
  return JSON.parse(JSON.stringify(document)) as DeviceScenarioDocument;
}

/**
 * Клонирует системный UserCase в user workspace slot (U10 W2b).
 * Каталог не меняется; результат готов к persist в IndexedDB.
 */
export function cloneUserCaseToWorkspaceDocument(
  input: CloneUserCaseToWorkspaceInput,
): DeviceScenarioDocument {
  const copied = deepCopyDeviceScenarioDocument(input.sourceDocument);
  const fallbackTitle = copied.meta?.title?.trim();
  const title =
    input.title?.trim() ||
    (fallbackTitle !== undefined && fallbackTitle.length > 0 ? fallbackTitle : 'Клон сценария');

  return stampUserWorkspaceDocument({
    ...copied,
    meta: {
      title,
      workspaceKind: 'user',
      workspaceId: input.workspaceId,
      clonedFromUserCaseId: input.userCaseId,
    },
  });
}
