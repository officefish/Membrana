import type { DeviceScenarioDocument } from '@membrana/core';

import { exportDeviceScenarioDocument, type ExportedDeviceScenario } from './export-device-scenario.js';

function sanitizeFilenameSegment(value: string): string {
  const trimmed = value.trim().replace(/\.json$/i, '');
  if (trimmed.length === 0) {
    return 'usercase';
  }
  return trimmed.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Suggested download name for a full `device-scenario` export. */
export function deviceScenarioExportFilename(
  document: DeviceScenarioDocument,
  options?: { readonly label?: string },
): string {
  const label =
    options?.label?.trim() ||
    document.meta?.title?.trim() ||
    document.meta?.workspaceId?.trim();
  if (label !== undefined && label.length > 0) {
    return `${sanitizeFilenameSegment(label)}.json`;
  }
  return `device-scenario-${document.deviceKind}.json`;
}

/** Exports full `device-scenario` JSON and triggers a browser download. */
export async function downloadDeviceScenarioJson(
  document: DeviceScenarioDocument,
  downloadName?: string,
): Promise<ExportedDeviceScenario> {
  const exported = await exportDeviceScenarioDocument(document);
  const name = downloadName ?? deviceScenarioExportFilename(document);

  const blob = new Blob([exported.json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);

  return exported;
}
