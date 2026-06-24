import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';

import { DEFAULT_USERCASE_MVP_MICROPHONE_BETA_DOCUMENT } from './default-usercase-mvp-microphone-beta.generated.js';
import { stampCompetitionDocumentMeta } from './execution-policy.js';

let cachedDocument: DeviceScenarioDocument | null = null;

/** Embedded Team Beta competition UserCase document. */
export function getDefaultMvpMicrophoneBetaDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(DEFAULT_USERCASE_MVP_MICROPHONE_BETA_DOCUMENT);
  if (!parsed.ok) {
    throw new Error(`Beta UserCase document invalid: ${parsed.error.message}`);
  }
  cachedDocument = stampCompetitionDocumentMeta(parsed.value);
  return cachedDocument;
}
