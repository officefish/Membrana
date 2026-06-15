/**
 * Maps MP5 cabinet rows → live journal items (TJ6).
 * Duplicated from @membrana/telemetry-journal-service for NestJS CJS runtime.
 */

const TELEMETRY_TRACK_SCHEMA_VERSION = 'telemetry-track/v1';

export interface LiveJournalItemRow {
  id: string;
  kind: 'track' | 'report';
  timestamp: number;
  clientEntryId: string;
  moduleId: string;
  moduleName: string;
  tags: string[];
  track?: Record<string, unknown>;
  report?: Record<string, unknown>;
}

interface ReportRow {
  id: string;
  reportKind: string;
  clientEntryId: string | null;
  moduleId: string | null;
  moduleName: string | null;
  finishedAt: string;
  payload: unknown;
  tags: string[];
}

interface LiveRecordRow {
  id: string;
  recordKind: string;
  clientRecordId: string | null;
  moduleId: string | null;
  startedAt: string;
  payload: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isTelemetryTrackLiveRecord(record: LiveRecordRow): boolean {
  if (record.recordKind === TELEMETRY_TRACK_SCHEMA_VERSION) return true;
  return isRecord(record.payload) && record.payload.schema === TELEMETRY_TRACK_SCHEMA_VERSION;
}

function isLiveJournalReportRow(report: ReportRow): boolean {
  if (report.reportKind === 'drone-detection-report/v1') return true;
  return isRecord(report.payload) && typeof report.payload.trackId === 'string';
}

function liveRecordToJournalItem(record: LiveRecordRow): LiveJournalItemRow | null {
  if (!isTelemetryTrackLiveRecord(record) || !isRecord(record.payload)) return null;
  const nested = isRecord(record.payload.item) ? record.payload.item : record.payload;
  const trackId = readString(nested.trackId);
  const sampleId = readString(nested.sampleId);
  const title = readString(nested.title);
  const createdAtIso = readString(nested.createdAtIso);
  const durationSec = readNumber(nested.durationSec);
  const sampleRate = readNumber(nested.sampleRate);
  const captureMode =
    nested.captureMode === 'manual' ? 'manual' : nested.captureMode === 'auto' ? 'auto' : null;
  if (!trackId || !sampleId || !title || !createdAtIso || durationSec === null || !captureMode) {
    return null;
  }

  return {
    id: record.id,
    kind: 'track',
    timestamp: Date.parse(record.startedAt),
    clientEntryId: record.clientRecordId ?? `live-track-${trackId}`,
    moduleId: record.moduleId ?? 'microphone',
    moduleName: readString(record.payload.moduleName) ?? 'microphone',
    tags: ['live', 'track'],
    track: {
      schema: TELEMETRY_TRACK_SCHEMA_VERSION,
      trackId,
      sampleId,
      title,
      durationSec,
      sampleRate: sampleRate ?? 48_000,
      captureMode,
      createdAtIso,
    },
  };
}

function reportToJournalItem(report: ReportRow): LiveJournalItemRow | null {
  if (!isLiveJournalReportRow(report) || !isRecord(report.payload)) return null;
  const schema = readString(report.payload.schema);
  const reportId = readString(report.payload.reportId);
  const trackId = readString(report.payload.trackId);
  const isDetected = readBoolean(report.payload.isDetected);
  if (!schema || !reportId || !trackId || isDetected === null) return null;

  return {
    id: report.id,
    kind: 'report',
    timestamp: Date.parse(report.finishedAt),
    clientEntryId: report.clientEntryId ?? `live-report-${reportId}`,
    moduleId: report.moduleId ?? 'microphone',
    moduleName: report.moduleName ?? 'microphone',
    tags: report.tags.length > 0 ? [...report.tags] : ['live', 'report', isDetected ? 'detection' : 'clear'],
    report: {
      schema,
      reportId,
      trackId,
      isDetected,
      summaryText: readString(report.payload.summaryText) ?? undefined,
      payload: isRecord(report.payload.payload) ? report.payload.payload : {},
    },
  };
}

/** Merge cabinet rows into canonical live journal items. */
export function cabinetRowsToLiveJournalItems(
  reports: readonly ReportRow[],
  liveRecords: readonly LiveRecordRow[],
): LiveJournalItemRow[] {
  const byClientEntryId = new Map<string, LiveJournalItemRow>();

  for (const record of liveRecords) {
    const item = liveRecordToJournalItem(record);
    if (item) byClientEntryId.set(item.clientEntryId, item);
  }

  for (const report of reports) {
    const item = reportToJournalItem(report);
    if (item) byClientEntryId.set(item.clientEntryId, item);
  }

  return [...byClientEntryId.values()].sort((a, b) => b.timestamp - a.timestamp);
}
