import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';

import { DEFAULT_USERCASE_MVP_MICROPHONE_ALPHA_DOCUMENT } from './default-usercase-mvp-microphone-alpha.generated.js';

let cachedDocument: DeviceScenarioDocument | null = null;

/** Embedded Team Alpha competition UserCase document. */
export function getDefaultMvpMicrophoneAlphaDocument(): DeviceScenarioDocument {
  if (cachedDocument !== null) {
    return cachedDocument;
  }
  const parsed = parseDeviceScenarioDocument(DEFAULT_USERCASE_MVP_MICROPHONE_ALPHA_DOCUMENT);
  if (!parsed.ok) {
    throw new Error(`Alpha UserCase document invalid: ${parsed.error.message}`);
  }
  cachedDocument = parsed.value;
  return cachedDocument;
}
