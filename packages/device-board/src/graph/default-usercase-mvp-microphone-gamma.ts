import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';

import { DEFAULT_USERCASE_MVP_MICROPHONE_GAMMA_DOCUMENT } from './default-usercase-mvp-microphone-gamma.generated.js';
import { stampCompetitionDocumentMeta } from './execution-policy.js';

let cachedDocument: DeviceScenarioDocument | null = null;

/** Embedded Team Gamma competition UserCase document. */
export function getDefaultMvpMicrophoneGammaDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(DEFAULT_USERCASE_MVP_MICROPHONE_GAMMA_DOCUMENT);
  if (!parsed.ok) {
    throw new Error(`Gamma UserCase document invalid: ${parsed.error.message}`);
  }
  cachedDocument = stampCompetitionDocumentMeta(parsed.value);
  return cachedDocument;
}
