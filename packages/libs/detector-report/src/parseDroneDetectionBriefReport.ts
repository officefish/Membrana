import {
  DRONE_DETECTION_BRIEF_SCHEMA_VERSION,
  type DetailedReportStatus,
  type DroneDetectionBriefReport,
  type DroneDetectionBriefReportMeta,
  type DroneDetectionBriefVerdict,
  type DroneDetectorName,
} from './types.js';

const DRONE_DETECTOR_NAMES: readonly DroneDetectorName[] = [
  'harmonic',
  'cepstral',
  'spectral-flux',
  'template-match',
];

const ANALYSIS_MODES: readonly NonNullable<DroneDetectionBriefReportMeta['analysisMode']>[] = [
  'stream-manual',
  'stream-auto',
  'track-import',
];

const DETAILED_STATUSES: readonly DetailedReportStatus[] = [
  'none',
  'pending',
  'ready',
  'error',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isDroneDetectorName(value: unknown): value is DroneDetectorName {
  return isString(value) && (DRONE_DETECTOR_NAMES as readonly string[]).includes(value);
}

function isAnalysisMode(
  value: unknown,
): value is NonNullable<DroneDetectionBriefReportMeta['analysisMode']> {
  return isString(value) && (ANALYSIS_MODES as readonly string[]).includes(value);
}

function isDetailedReportStatus(value: unknown): value is DetailedReportStatus {
  return isString(value) && (DETAILED_STATUSES as readonly string[]).includes(value);
}

function parseBriefVerdict(value: unknown): DroneDetectionBriefVerdict | null {
  if (!isRecord(value)) return null;
  if (!isDroneDetectorName(value.detectorName)) return null;
  if (value.detectorFamily !== 'dsp') return null;
  if (!isBoolean(value.isDrone)) return null;
  if (!isNumber(value.confidence)) return null;

  return {
    detectorName: value.detectorName,
    detectorFamily: 'dsp',
    isDrone: value.isDrone,
    confidence: value.confidence,
  };
}

function parseBriefMeta(value: unknown): DroneDetectionBriefReportMeta | null {
  if (!isRecord(value)) return null;
  if (!isString(value.reportId)) return null;
  if (!isString(value.createdAtIso)) return null;
  if (!isString(value.createdAtMoscow)) return null;
  if (value.schemaVersion !== DRONE_DETECTION_BRIEF_SCHEMA_VERSION) return null;
  if (!isString(value.sampleId)) return null;
  if (value.sampleTitle !== null && !isString(value.sampleTitle)) return null;
  if (!isNumber(value.sampleRate)) return null;
  if (!isNumber(value.sampleDurationSec)) return null;
  if (!isDetailedReportStatus(value.detailedReportStatus)) return null;

  if (value.analysisMode !== undefined && !isAnalysisMode(value.analysisMode)) return null;
  if (value.detailedReportId !== undefined && !isString(value.detailedReportId)) return null;
  if (value.detailedReportError !== undefined && !isString(value.detailedReportError)) return null;

  return {
    reportId: value.reportId,
    createdAtIso: value.createdAtIso,
    createdAtMoscow: value.createdAtMoscow,
    schemaVersion: DRONE_DETECTION_BRIEF_SCHEMA_VERSION,
    sampleId: value.sampleId,
    sampleTitle: value.sampleTitle as string | null,
    sampleRate: value.sampleRate,
    sampleDurationSec: value.sampleDurationSec,
    detailedReportStatus: value.detailedReportStatus,
    ...(value.analysisMode !== undefined ? { analysisMode: value.analysisMode } : {}),
    ...(value.detailedReportId !== undefined
      ? { detailedReportId: value.detailedReportId }
      : {}),
    ...(value.detailedReportError !== undefined
      ? { detailedReportError: value.detailedReportError }
      : {}),
  };
}

/** Validate unknown JSON into a typed DroneDetectionBriefReport (journal / export round-trip). */
export function parseDroneDetectionBriefReport(value: unknown): DroneDetectionBriefReport | null {
  if (!isRecord(value)) return null;

  const meta = parseBriefMeta(value.meta);
  if (!meta) return null;
  if (!Array.isArray(value.verdicts)) return null;

  const verdicts: DroneDetectionBriefVerdict[] = [];
  for (const item of value.verdicts) {
    const verdict = parseBriefVerdict(item);
    if (!verdict) return null;
    verdicts.push(verdict);
  }

  return { meta, verdicts };
}
