/**
 * Контракт Report для device-board scenario graph v0.6.
 * Зеркалит `LiveJournalReportPayload` (@membrana/telemetry-journal-service) без зависимости.
 * @see packages/device-board/DEVICE_BOARD_CONCEPT.md §17
 */
import type { SoundClass } from '../sound-class.js';


/** Известные schema version для MakeReportFromTrack / MakeReportFromAnalysis. */
export const SCENARIO_REPORT_SCHEMAS = [
  'telemetry-track/v1',
  'drone-detection-report/v1',
  'trends-fft/v0.1',
  /** basn-5: единый combined-отчёт (2 анализа + трек + fusion). */
  'combined-detection/v1',
  /** ADR-0006 PC-1: отчёт одиночного нейро-детектора (одна модальность, без combined). */
  'neuro-detection/v1',
] as const;

export type ScenarioReportSchema = (typeof SCENARIO_REPORT_SCHEMAS)[number];

/**
 * Унифицированный payload отчёта в dataflow / journal.
 * `ReportRef` в runtime указывает на in-memory экземпляр этого DTO.
 */
export interface ScenarioReportPayload {
  readonly schema: string;
  readonly reportId: string;
  readonly trackId: string;
  readonly isDetected: boolean;
  readonly soundClass?: SoundClass;
  readonly summaryText?: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** Префикс handle для ReportRef. */
export const REPORT_REF_HANDLE_PREFIX = 'report' as const;

/** Префикс handle для TrackRef. */
export const TRACK_REF_HANDLE_PREFIX = 'track' as const;

/** Префикс handle для FftTrendAnalysisRef. */
export const FFT_TREND_ANALYSIS_REF_HANDLE_PREFIX = 'analysis' as const;

/** basn-1: префикс handle для EnsembleAnalysisRef. */
export const ENSEMBLE_ANALYSIS_REF_HANDLE_PREFIX = 'ensemble-analysis' as const;

/** Type guard для известных schema (non-exhaustive allowlist). */
export function isKnownScenarioReportSchema(value: string): value is ScenarioReportSchema {
  return (SCENARIO_REPORT_SCHEMAS as readonly string[]).includes(value);
}

/** Создаёт канонический handle ReportRef. */
export function formatReportRefHandle(reportId: string): string {
  return `${REPORT_REF_HANDLE_PREFIX}:${reportId}`;
}

/** Создаёт канонический handle TrackRef. */
export function formatTrackRefHandle(trackId: string): string {
  return `${TRACK_REF_HANDLE_PREFIX}:${trackId}`;
}

/** Создаёт канонический handle FftTrendAnalysisRef. */
export function formatFftTrendAnalysisRefHandle(analysisId: string): string {
  return `${FFT_TREND_ANALYSIS_REF_HANDLE_PREFIX}:${analysisId}`;
}

/** basn-1: создаёт канонический handle EnsembleAnalysisRef. */
export function formatEnsembleAnalysisRefHandle(analysisId: string): string {
  return `${ENSEMBLE_ANALYSIS_REF_HANDLE_PREFIX}:${analysisId}`;
}

/** Создаёт payload отчёта с обязательными полями. */
export function createScenarioReportPayload(
  input: ScenarioReportPayload,
): ScenarioReportPayload {
  return {
    schema: input.schema,
    reportId: input.reportId,
    trackId: input.trackId,
    isDetected: input.isDetected,
    soundClass: input.soundClass,
    summaryText: input.summaryText,
    payload: input.payload,
  };
}

/** True, если value похож на ScenarioReportPayload. */
export function isScenarioReportPayload(value: unknown): value is ScenarioReportPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.schema === 'string' &&
    typeof record.reportId === 'string' &&
    typeof record.trackId === 'string' &&
    typeof record.isDetected === 'boolean' &&
    typeof record.payload === 'object' &&
    record.payload !== null &&
    !Array.isArray(record.payload)
  );
}
