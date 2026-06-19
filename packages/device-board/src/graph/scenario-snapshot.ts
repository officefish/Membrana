import type { DeviceScenarioDocument } from '@membrana/core';

/** Стабильный отпечаток документа для сравнения saved vs draft. */
export function scenarioDocumentFingerprint(document: DeviceScenarioDocument): string {
  return JSON.stringify(document);
}
