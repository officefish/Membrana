import type { TelemetryEntry } from '@membrana/telemetry-service';
import type { StrictnessLevel, ThresholdTestMode } from '@membrana/fft-analyzer-service';

import type {
  FftThresholdFrameReportRow,
  FftThresholdTestReport,
} from '../../../plugins/fft-threshold-test/buildFftThresholdTestReport';
import { METRIC_NORM } from '../../../lib/fftMetricNormalize';

export const FFT_THRESHOLD_TELEMETRY_SCHEMA = 'fft-threshold-test/v0.2';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStrictness(value: unknown): value is StrictnessLevel {
  return value === 'easy' || value === 'normal' || value === 'strict';
}

function isMode(value: unknown): value is ThresholdTestMode {
  return value === 'auto' || value === 'manual';
}

function parseThresholdRange(raw: unknown): { min: number; max: number } | null {
  if (!isRecord(raw)) return null;
  if (!isFiniteNumber(raw.min) || !isFiniteNumber(raw.max)) return null;
  return { min: raw.min, max: raw.max };
}

function parseThresholds(raw: unknown): FftThresholdTestReport['thresholds'] | null {
  if (!isRecord(raw)) return null;
  const centroid = parseThresholdRange(raw.centroid);
  const flux = parseThresholdRange(raw.flux);
  const rms = parseThresholdRange(raw.rms);
  if (!centroid || !flux || !rms) return null;
  return { centroid, flux, rms };
}

function parseNormalization(raw: unknown): FftThresholdTestReport['normalization'] {
  if (!isRecord(raw)) return { ...METRIC_NORM };
  return {
    centroidHzMax: isFiniteNumber(raw.centroidHzMax) ? raw.centroidHzMax : METRIC_NORM.centroidHzMax,
    fluxRefMax: isFiniteNumber(raw.fluxRefMax) ? raw.fluxRefMax : METRIC_NORM.fluxRefMax,
    loudnessRefMax: isFiniteNumber(raw.loudnessRefMax) ? raw.loudnessRefMax : METRIC_NORM.loudnessRefMax,
  };
}

function parseFrameRow(raw: unknown): FftThresholdFrameReportRow | null {
  if (!isRecord(raw)) return null;
  if (!isFiniteNumber(raw.index)) return null;
  const required = [
    'timestamp',
    'centroidHz',
    'centroidNorm',
    'fluxRaw',
    'fluxNorm',
    'rmsRaw',
    'rmsNorm',
  ] as const;
  for (const key of required) {
    if (!isFiniteNumber(raw[key])) return null;
  }
  const boolKeys = ['centroidInRange', 'fluxInRange', 'rmsInRange', 'framePassed'] as const;
  for (const key of boolKeys) {
    if (typeof raw[key] !== 'boolean') return null;
  }
  return {
    index: raw.index,
    timestamp: raw.timestamp,
    centroidHz: raw.centroidHz,
    centroidNorm: raw.centroidNorm,
    fluxRaw: raw.fluxRaw,
    fluxNorm: raw.fluxNorm,
    rmsRaw: raw.rmsRaw,
    rmsNorm: raw.rmsNorm,
    centroidInRange: raw.centroidInRange,
    fluxInRange: raw.fluxInRange,
    rmsInRange: raw.rmsInRange,
    framePassed: raw.framePassed,
  };
}

function parseTestId(data: Record<string, unknown>): string | null {
  const rid = data.reportUniqueId;
  if (typeof rid === 'string' && rid.startsWith('fft-test-')) {
    const id = rid.slice('fft-test-'.length);
    return id.length > 0 ? id : null;
  }
  if (typeof data.testId === 'string' && data.testId.length > 0) {
    return data.testId;
  }
  return null;
}

/** Восстанавливает DTO отчёта FFT из записи телеметрии; при невалидном payload — `null`. */
export function fftThresholdReportFromEntry(
  entry: TelemetryEntry,
): FftThresholdTestReport | null {
  if (entry.type !== 'analysis') return null;
  const data = entry.data;
  if (!isRecord(data)) return null;
  if (data.schema !== FFT_THRESHOLD_TELEMETRY_SCHEMA) return null;

  const testId = parseTestId(data);
  if (!testId) return null;
  if (!isFiniteNumber(data.startedAt) || !isFiniteNumber(data.finishedAt)) return null;
  if (typeof data.isDetected !== 'boolean') return null;
  if (!isFiniteNumber(data.passedCount) || !isFiniteNumber(data.passRate)) return null;
  if (!isFiniteNumber(data.frameCount) || !isFiniteNumber(data.intervalMs)) return null;
  if (!isStrictness(data.strictness) || !isMode(data.mode)) return null;

  const thresholds = parseThresholds(data.thresholds);
  if (!thresholds) return null;

  if (!Array.isArray(data.frames) || data.frames.length === 0) return null;
  const frames: FftThresholdFrameReportRow[] = [];
  for (let i = 0; i < data.frames.length; i += 1) {
    const row = parseFrameRow(data.frames[i]);
    if (!row) return null;
    frames.push(row);
  }

  return {
    testId,
    startedAt: data.startedAt,
    finishedAt: data.finishedAt,
    isDetected: data.isDetected,
    passedCount: data.passedCount,
    passRate: data.passRate,
    frameCount: data.frameCount,
    strictness: data.strictness,
    mode: data.mode,
    intervalMs: data.intervalMs,
    thresholds,
    normalization: parseNormalization(data.normalization),
    frames,
  };
}
