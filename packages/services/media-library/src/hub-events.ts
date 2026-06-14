import type { NewSampleMeta, SampleSource } from './types.js';

/** Output container for mic-buffer-recorder plugin. */
export type MediaLibraryCaptureFormat = 'wav' | 'webm' | 'mp4';

export type MediaLibraryRecordingMode = 'manual' | 'auto';

export type MediaLibraryCaptureStopReason = 'user' | 'timer' | 'auto' | 'error';

export interface MediaLibraryCaptureStartPayload {
  mode: MediaLibraryRecordingMode;
  format: MediaLibraryCaptureFormat;
  /** Manual: target duration (sec), capped at 30. */
  targetDurationSec?: number;
  /** Auto: clip length 1–3 s. */
  clipLengthSec?: number;
  /** Auto: pause between clips (presets 3–30 s). */
  intervalSec?: number;
  sourcePluginId: string;
}

export interface MediaLibraryCaptureStopPayload {
  reason: MediaLibraryCaptureStopReason;
  blob: Blob;
  meta: Omit<NewSampleMeta, 'source'> & { source?: SampleSource };
  sourcePluginId: string;
}

export interface MediaLibraryCaptureCancelPayload {
  reason: string;
  sourcePluginId: string;
}

export interface MediaLibraryQuotaUpdatedPayload {
  usedBytes: number;
  limitBytes: number;
  sampleCount: number;
  maxBufferSamples: number;
  recordingBlocked: boolean;
}

export const MEDIA_LIBRARY_HUB = {
  captureStart: 'media-library.capture.start',
  captureStop: 'media-library.capture.stop',
  captureCancel: 'media-library.capture.cancel',
  quotaUpdated: 'media-library.quota.updated',
  bufferCleared: 'media-library.buffer.cleared',
} as const;

export type MediaLibraryHubEventName =
  (typeof MEDIA_LIBRARY_HUB)[keyof typeof MEDIA_LIBRARY_HUB];
