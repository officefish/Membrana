import type { MediaLibraryCaptureFormat } from '@membrana/media-library-service';

import { MAX_MANUAL_DURATION_SEC } from './types';

export function clampManualTargetSec(presetSec: number): number {
  if (!Number.isFinite(presetSec) || presetSec <= 0) return MAX_MANUAL_DURATION_SEC;
  return Math.min(MAX_MANUAL_DURATION_SEC, presetSec);
}

const WEBM_MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm'] as const;
const MP4_MIME_CANDIDATES = ['audio/mp4', 'audio/aac', 'audio/mpeg'] as const;

export function resolveMediaRecorderMime(format: 'webm' | 'mp4'): string | undefined {
  const candidates = format === 'mp4' ? MP4_MIME_CANDIDATES : WEBM_MIME_CANDIDATES;
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return undefined;
}

export function isCaptureFormatSupported(format: MediaLibraryCaptureFormat): boolean {
  if (format === 'wav') return typeof AudioContext !== 'undefined';
  return resolveMediaRecorderMime(format) != null;
}

export function pickFallbackCaptureFormat(
  requested: MediaLibraryCaptureFormat,
): MediaLibraryCaptureFormat {
  if (isCaptureFormatSupported(requested)) return requested;
  if (isCaptureFormatSupported('webm')) return 'webm';
  if (isCaptureFormatSupported('mp4')) return 'mp4';
  return 'wav';
}

export function formatCaptureLabel(format: MediaLibraryCaptureFormat): string {
  switch (format) {
    case 'wav':
      return 'WAV';
    case 'webm':
      return 'WebM';
    case 'mp4':
      return 'MP4';
  }
}
