import type { NewSampleMeta, SampleSource } from './types.js';
import type { MediaLibraryStorageMode } from './quota-status.js';

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
  /** Owning agenda module (e.g. microphone). */
  moduleId?: string;
}

export interface MediaLibraryCaptureStopPayload {
  reason: MediaLibraryCaptureStopReason;
  blob: Blob;
  meta: Omit<NewSampleMeta, 'source'> & { source?: SampleSource };
  sourcePluginId: string;
  moduleId?: string;
  captureMode?: MediaLibraryRecordingMode;
}

/** Emitted after mic clip lands in buffer collection (TJ3 live journal). */
export interface MediaLibrarySampleImportedPayload {
  sampleId: string;
  moduleId: string;
  sourcePluginId: string;
  captureMode: MediaLibraryRecordingMode;
  reason: MediaLibraryCaptureStopReason;
  title: string;
  durationSec: number;
  sampleRate: number;
  /** Set when live journal track row was appended (TJ3/TJ10). */
  journalTrackId?: string;
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
  storageMode: MediaLibraryStorageMode;
}

export const MEDIA_LIBRARY_HUB = {
  captureStart: 'media-library.capture.start',
  captureStop: 'media-library.capture.stop',
  captureCancel: 'media-library.capture.cancel',
  quotaUpdated: 'media-library.quota.updated',
  bufferCleared: 'media-library.buffer.cleared',
  sampleImported: 'media-library.sample.imported',
} as const;

export type MediaLibraryHubEventName =
  (typeof MEDIA_LIBRARY_HUB)[keyof typeof MEDIA_LIBRARY_HUB];
