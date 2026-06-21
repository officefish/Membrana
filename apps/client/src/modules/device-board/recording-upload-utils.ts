import type { ScenarioCaptureFormat } from '@membrana/core';

import { resolveMediaRecorderMime } from '@/plugins/mic-buffer-recorder/recordingUtils';

/** Canonical MIME for scenario recording upload (parity mic-buffer-recorder). */
export function captureFormatToMimeType(format: ScenarioCaptureFormat): string {
  if (format === 'wav') {
    return 'audio/wav';
  }
  if (format === 'webm') {
    return resolveMediaRecorderMime('webm') ?? 'audio/webm';
  }
  return resolveMediaRecorderMime('mp4') ?? 'audio/mp4';
}

/**
 * Ensures blob carries a stable MIME before media-library import.
 * Re-wraps only when type is missing or generic.
 */
export function normalizeCaptureBlob(blob: Blob, format: ScenarioCaptureFormat): Blob {
  const expectedMime = captureFormatToMimeType(format);
  if (
    blob.type.length > 0 &&
    blob.type !== 'application/octet-stream' &&
    blob.type !== expectedMime
  ) {
    return blob;
  }
  if (blob.type === expectedMime) {
    return blob;
  }
  return new Blob([blob], { type: expectedMime });
}

/** Notes field for buffer samples (format tag for cabinet/debug). */
export function buildRecordingUploadNotes(
  nodeId: string,
  captureFormat: ScenarioCaptureFormat,
): string {
  return `scenario make-track node ${nodeId};format=${captureFormat}`;
}
