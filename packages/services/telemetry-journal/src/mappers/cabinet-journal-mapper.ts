import {
  LIVE_JOURNAL_CLEAR_TAG,
  LIVE_JOURNAL_DETECTION_TAG,
  LIVE_JOURNAL_MODULE_NAME,
  LIVE_JOURNAL_REPORT_TAGS,
  LIVE_JOURNAL_TRACK_TAGS,
} from '../constants.js';
import {
  liveJournalReportClientEntryId,
  liveJournalTrackClientEntryId,
} from '../backends/memory-journal-storage-backend.js';
import type {
  CabinetTelemetryLiveRecordDto,
  CabinetTelemetryReportDto,
  CreateCabinetTelemetryLiveRecordInput,
  CreateCabinetTelemetryReportInput,
} from '../ports/cabinet-journal-port.js';
import type {
  AppendLiveJournalReportInput,
  AppendLiveJournalTrackInput,
  LiveJournalItem,
  LiveJournalReportPayload,
  LiveJournalTrackPayload,
} from '../types.js';
import { TELEMETRY_TRACK_SCHEMA_VERSION } from '../types.js';

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

function parseTrackPayload(payload: Record<string, unknown>): LiveJournalTrackPayload | null {
  const nested = isRecord(payload.item) ? payload.item : payload;
  const schema = readString(nested.schema);
  if (schema !== TELEMETRY_TRACK_SCHEMA_VERSION) return null;

  const trackId = readString(nested.trackId);
  const sampleId = readString(nested.sampleId);
  const title = readString(nested.title);
  const createdAtIso = readString(nested.createdAtIso);
  const durationSec = readNumber(nested.durationSec);
  const sampleRate = readNumber(nested.sampleRate);
  const captureMode = nested.captureMode === 'manual' ? 'manual' : nested.captureMode === 'auto' ? 'auto' : null;

  if (!trackId || !sampleId || !title || !createdAtIso || durationSec === null || sampleRate === null || !captureMode) {
    return null;
  }

  return {
    schema: TELEMETRY_TRACK_SCHEMA_VERSION,
    trackId,
    liveSessionId: readString(nested.liveSessionId) ?? undefined,
    sampleId,
    title,
    durationSec,
    sampleRate,
    captureMode,
    createdAtIso,
  };
}

function parseReportPayload(payload: Record<string, unknown>): LiveJournalReportPayload | null {
  const schema = readString(payload.schema);
  const reportId = readString(payload.reportId);
  const trackId = readString(payload.trackId);
  const isDetected = readBoolean(payload.isDetected);

  if (!schema || !reportId || !trackId || isDetected === null) {
    return null;
  }

  const nestedPayload = isRecord(payload.payload) ? payload.payload : {};
  const knownKeys = new Set(['schema', 'reportId', 'trackId', 'isDetected', 'summaryText', 'payload']);
  const spreadPayload: Record<string, unknown> = { ...nestedPayload };

  for (const [key, value] of Object.entries(payload)) {
    if (knownKeys.has(key)) continue;
    spreadPayload[key] = value;
  }

  return {
    schema,
    reportId,
    trackId,
    isDetected,
    summaryText: readString(payload.summaryText) ?? undefined,
    payload: spreadPayload,
  };
}

function buildTrackTags(extra?: readonly string[]): string[] {
  return [...LIVE_JOURNAL_TRACK_TAGS, ...(extra ?? [])];
}

function buildReportTags(report: LiveJournalReportPayload, extra?: readonly string[]): string[] {
  const tags = [...LIVE_JOURNAL_REPORT_TAGS, ...(extra ?? [])];
  tags.push(report.isDetected ? LIVE_JOURNAL_DETECTION_TAG : LIVE_JOURNAL_CLEAR_TAG);
  return tags;
}

/** Whether cabinet live record belongs to live journal track stream. */
export function isTelemetryTrackLiveRecord(record: CabinetTelemetryLiveRecordDto): boolean {
  if (record.recordKind === TELEMETRY_TRACK_SCHEMA_VERSION) return true;
  return isRecord(record.payload) && record.payload.schema === TELEMETRY_TRACK_SCHEMA_VERSION;
}

/** Whether cabinet report belongs to live journal report stream. */
export function isLiveJournalReportRow(report: CabinetTelemetryReportDto): boolean {
  if (report.reportKind === 'drone-detection-report/v1') return true;
  if (report.reportKind === 'drone-detection-brief/v1') return true;
  return isRecord(report.payload) && typeof report.payload.trackId === 'string';
}

/** Map cabinet live record → `LiveJournalItem` track row. */
export function liveRecordToJournalItem(record: CabinetTelemetryLiveRecordDto): LiveJournalItem | null {
  if (!isTelemetryTrackLiveRecord(record)) return null;
  if (!isRecord(record.payload)) return null;

  const track = parseTrackPayload(record.payload);
  if (!track) return null;

  const tagsFromPayload = Array.isArray(record.payload.tags)
    ? record.payload.tags.filter((tag): tag is string => typeof tag === 'string')
    : [];

  return {
    id: record.id,
    kind: 'track',
    timestamp: Date.parse(record.startedAt),
    clientEntryId: record.clientRecordId ?? liveJournalTrackClientEntryId(track.trackId),
    moduleId: record.moduleId ?? LIVE_JOURNAL_MODULE_NAME,
    moduleName: readString(record.payload.moduleName) ?? LIVE_JOURNAL_MODULE_NAME,
    tags: buildTrackTags(tagsFromPayload),
    track,
  };
}

/** Map cabinet report → `LiveJournalItem` report row. */
export function reportToJournalItem(report: CabinetTelemetryReportDto): LiveJournalItem | null {
  if (!isLiveJournalReportRow(report)) return null;
  if (!isRecord(report.payload)) return null;

  const parsed = parseReportPayload(report.payload);
  if (!parsed) return null;

  return {
    id: report.id,
    kind: 'report',
    timestamp: Date.parse(report.finishedAt),
    clientEntryId: report.clientEntryId ?? liveJournalReportClientEntryId(parsed.reportId),
    moduleId: report.moduleId ?? LIVE_JOURNAL_MODULE_NAME,
    moduleName: report.moduleName ?? LIVE_JOURNAL_MODULE_NAME,
    tags: report.tags.length > 0 ? [...report.tags] : buildReportTags(parsed),
    report: parsed,
  };
}

/** Merge cabinet rows into canonical journal items. */
export function cabinetRowsToJournalItems(
  reports: readonly CabinetTelemetryReportDto[],
  liveRecords: readonly CabinetTelemetryLiveRecordDto[],
): LiveJournalItem[] {
  const byClientEntryId = new Map<string, LiveJournalItem>();

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

/** Track append input → cabinet live record create body. */
export function trackInputToCabinetLiveRecord(
  input: AppendLiveJournalTrackInput,
): CreateCabinetTelemetryLiveRecordInput {
  return {
    recordKind: TELEMETRY_TRACK_SCHEMA_VERSION,
    clientRecordId: input.clientEntryId,
    moduleId: input.moduleId,
    startedAt: input.track.createdAtIso,
    payload: {
      item: input.track,
      moduleName: input.moduleName,
      tags: input.tags ?? [],
    },
  };
}

/** Report append input → cabinet report create body. */
export function reportInputToCabinetReport(
  input: AppendLiveJournalReportInput,
): CreateCabinetTelemetryReportInput {
  const finishedAt = new Date(input.timestamp ?? Date.now()).toISOString();
  return {
    reportKind: input.report.schema,
    clientEntryId: input.clientEntryId,
    moduleId: input.moduleId,
    moduleName: input.moduleName,
    finishedAt,
    payload: {
      schema: input.report.schema,
      reportId: input.report.reportId,
      trackId: input.report.trackId,
      isDetected: input.report.isDetected,
      summaryText: input.report.summaryText,
      payload: input.report.payload,
    },
    tags: buildReportTags(input.report, input.tags),
  };
}
