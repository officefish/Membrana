/** IPC journal types — mirror `@membrana/telemetry-journal-service` (shell must not import ESM package). */

export const TELEMETRY_TRACK_SCHEMA_VERSION = 'telemetry-track/v1' as const;

export type LiveJournalItemKind = 'track' | 'report';

export type LiveJournalFilter = 'all' | 'tracks' | 'reports' | 'detections';

export interface LiveJournalTrackPayload {
  readonly schema: typeof TELEMETRY_TRACK_SCHEMA_VERSION;
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
