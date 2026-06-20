import type { DeviceScenarioDocument } from '@membrana/core';

import { canonicalizeJson, sha256Hex } from './document-hash.js';

export interface ExportedDeviceScenario {
  readonly document: DeviceScenarioDocument;
  readonly json: string;
  readonly hash: string;
}

/** Export JSON с `meta.exportedAt` и `meta.hash` (бриф V5). */
export async function exportDeviceScenarioDocument(
  document: DeviceScenarioDocument,
): Promise<ExportedDeviceScenario> {
  const exportedAt = new Date().toISOString();
  const withoutHash: DeviceScenarioDocument = {
    ...document,
    meta: {
      ...document.meta,
      exportedAt,
      hash: undefined,
    },
  };

  const canonical = canonicalizeJson(withoutHash);
  const hash = await sha256Hex(canonical);

  const withHash: DeviceScenarioDocument = {
    ...withoutHash,
    meta: {
      ...withoutHash.meta,
      hash,
    },
  };

  return {
    document: withHash,
    json: JSON.stringify(withHash, null, 2),
    hash,
  };
}
