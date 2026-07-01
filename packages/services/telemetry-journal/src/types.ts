/** Live journal track row schema (TJ1). */
import type { SoundClass } from '@membrana/core';

export const TELEMETRY_TRACK_SCHEMA_VERSION = 'telemetry-track/v1' as const;

export type TelemetryTrackSchemaVersion = typeof TELEMETRY_TRACK_SCHEMA_VERSION;

export type LiveJournalItemKind = 'track' | 'report';

export type LiveJournalStorageMode =
  | 'remote-server'
  | 'electron-fs'
  | 'browser-limited-fallback';

export interface LiveJournalTrackPayload {
  readonly schema: TelemetryTrackSchemaVersion;
  readonly trackId: string;
  readonly liveSessionId?: string;
  readonly sampleId: string;
  readonly title: string;
  readonly durationSec: number;
  readonly sampleRate: number;
  readonly captureMode: 'auto' | 'manual';
  readonly createdAtIso: string;
}

export interface LiveJournalReportPayload {
  readonly schema: string;
  readonly reportId: string;
  readonly trackId: string;
  readonly isDetected: boolean;
  readonly soundClass?: SoundClass;
  readonly summaryText?: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface LiveJournalItem {
  readonly id: string;
  readonly kind: LiveJournalItemKind;
  readonly timestamp: number;
  readonly clientEntryId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly tags: readonly string[];
  readonly track?: LiveJournalTrackPayload;
  readonly report?: LiveJournalReportPayload;
}

export interface LiveJournalSnapshot {
  readonly items: readonly LiveJournalItem[];
  readonly storageMode: LiveJournalStorageMode;
  readonly version: number;
}

export interface AppendLiveJournalTrackInput {
  readonly clientEntryId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly track: LiveJournalTrackPayload;
  readonly timestamp?: number;
  readonly tags?: readonly string[];
}

export interface AppendLiveJournalReportInput {
  readonly clientEntryId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly report: LiveJournalReportPayload;
  readonly timestamp?: number;
  readonly tags?: readonly string[];
}

export type LiveJournalFilter = 'all' | 'tracks' | 'reports' | 'detections';
export type LiveJournalSoundClassFilter = 'all' | SoundClass;
