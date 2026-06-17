/**
 * Общая нормализация FFT-метрик для UI (шкала 0…1).
 * Делители как в packages/temp/three-param-analyzer (÷5000, ÷1, ÷0.35).
 */
import type { ThresholdTestThresholds } from '@membrana/fft-analyzer-service';

import { getDroneTightSpectralThresholds } from './droneTightCalibration';

export const METRIC_NORM = {
  centroidHzMax: 5_000,
  fluxRefMax: 1,
  loudnessRefMax: 0.35,
} as const;

/** Калиброванная «зона дрона» free-v1 (DRONE_TIGHT p10–p90). */
export const DEMO_DRONE_THRESHOLDS = getDroneTightSpectralThresholds();

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeCentroidHz(hz: number): number {
  return clamp01(hz / METRIC_NORM.centroidHzMax);
}

export function denormalizeCentroidHz(norm: number): number {
  return clamp01(norm) * METRIC_NORM.centroidHzMax;
}

export function normalizeFlux(raw: number): number {
  return clamp01(raw / METRIC_NORM.fluxRefMax);
}

export function denormalizeFlux(norm: number): number {
  return clamp01(norm) * METRIC_NORM.fluxRefMax;
}

export function normalizeLoudness(raw: number): number {
  return clamp01(raw / METRIC_NORM.loudnessRefMax);
}

export function denormalizeLoudness(norm: number): number {
  return clamp01(norm) * METRIC_NORM.loudnessRefMax;
}

export interface NormalizedThresholds {
  readonly centroid: { readonly min: number; readonly max: number };
  readonly flux: { readonly min: number; readonly max: number };
  readonly loudness: { readonly min: number; readonly max: number };
}

export function thresholdsToNormalized(
  raw: ThresholdTestThresholds,
): NormalizedThresholds {
  return {
    centroid: {
      min: normalizeCentroidHz(raw.centroid.min),
      max: normalizeCentroidHz(raw.centroid.max),
    },
    flux: {
      min: normalizeFlux(raw.flux.min),
      max: normalizeFlux(raw.flux.max),
    },
    loudness: {
      min: normalizeLoudness(raw.rms.min),
      max: normalizeLoudness(raw.rms.max),
    },
  };
}

export function thresholdsFromNormalized(
  norm: NormalizedThresholds,
): ThresholdTestThresholds {
  return {
    centroid: {
      min: denormalizeCentroidHz(norm.centroid.min),
      max: denormalizeCentroidHz(norm.centroid.max),
    },
    flux: {
      min: denormalizeFlux(norm.flux.min),
      max: denormalizeFlux(norm.flux.max),
    },
    rms: {
      min: denormalizeLoudness(norm.loudness.min),
      max: denormalizeLoudness(norm.loudness.max),
    },
  };
}

export const DEFAULT_NORMALIZED_THRESHOLDS: NormalizedThresholds =
  thresholdsToNormalized({
    centroid: { ...DEMO_DRONE_THRESHOLDS.centroid },
    flux: { ...DEMO_DRONE_THRESHOLDS.flux },
    rms: { ...DEMO_DRONE_THRESHOLDS.rms },
  });

export function formatNorm(value: number): string {
  return clamp01(value).toFixed(2);
}

export function formatNormPercent(norm: number): string {
  return `${(clamp01(norm) * 100).toFixed(1)}%`;
}

export function formatRawCentroid(hz: number): string {
  return `${Math.round(hz)} Гц`;
}

export function formatRawFlux(raw: number): string {
  return raw.toFixed(3);
}

export function formatRawLoudness(raw: number): string {
  return raw.toFixed(4);
}

export function isInDroneZone(
  value: number,
  kind: 'centroid' | 'flux' | 'rms',
): boolean {
  const zone = DEMO_DRONE_THRESHOLDS[kind === 'rms' ? 'rms' : kind];
  return value >= zone.min && value <= zone.max;
}
