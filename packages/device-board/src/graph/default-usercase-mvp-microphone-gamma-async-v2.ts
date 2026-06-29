import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';

import { DEFAULT_USERCASE_MVP_MICROPHONE_GAMMA_ASYNC_V2_DOCUMENT } from './default-usercase-mvp-microphone-gamma-async-v2.generated.js';
import { stampCompetitionDocumentMeta } from './execution-policy.js';

let cachedDocument: DeviceScenarioDocument | null = null;

/** Embedded Team Gamma async-v2 competition UserCase document. */
export function getDefaultMvpMicrophoneGammaAsyncV2Document(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(DEFAULT_USERCASE_MVP_MICROPHONE_GAMMA_ASYNC_V2_DOCUMENT);
  if (!parsed.ok) {
    throw new Error(`Gamma async-v2 UserCase document invalid: ${parsed.error.message}`);
  }
  cachedDocument = stampCompetitionDocumentMeta(parsed.value);
  return cachedDocument;
}
