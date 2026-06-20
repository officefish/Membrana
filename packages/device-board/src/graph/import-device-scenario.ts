import { parseDeviceScenarioDocument, type DeviceScenarioDocument } from '@membrana/core';

import { hydrateBoardFromDocument, type HydratedBoardState } from './hydrate-board-from-document.js';

export interface ImportDeviceScenarioSuccess {
  readonly ok: true;
  readonly document: DeviceScenarioDocument;
  readonly state: HydratedBoardState;
}

export interface ImportDeviceScenarioFailure {
  readonly ok: false;
  readonly message: string;
}

export type ImportDeviceScenarioResult = ImportDeviceScenarioSuccess | ImportDeviceScenarioFailure;

/** Парсит JSON-строку и восстанавливает состояние канвасов. */
export function importDeviceScenarioFromJson(json: string): ImportDeviceScenarioResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json) as unknown;
  } catch {
    return { ok: false, message: 'Некорректный JSON' };
  }

  const parsed = parseDeviceScenarioDocument(raw);
  if (!parsed.ok) {
    return { ok: false, message: parsed.error.message };
  }

  return {
    ok: true,
    document: parsed.value,
    state: hydrateBoardFromDocument(parsed.value),
  };
}
