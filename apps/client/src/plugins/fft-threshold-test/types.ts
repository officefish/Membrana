import type {
  StrictnessLevel,
  ThresholdTestFrameCount,
  ThresholdTestThresholds,
} from '@membrana/fft-analyzer-service';

import { thresholdsFromNormalized, DEFAULT_NORMALIZED_THRESHOLDS } from './normalizeMetrics';

export const FFT_THRESHOLD_TEST_PLUGIN_ID = 'fft-threshold-test';

export interface FftThresholdTestPluginConfig {
  readonly mode: 'manual' | 'auto';
  readonly intervalMs: number;
  readonly frameCount: ThresholdTestFrameCount;
  readonly strictness: StrictnessLevel;
  readonly thresholds: ThresholdTestThresholds;
  readonly autoRestartDelayMs: number;
}

export const defaultFftThresholdTestConfig: FftThresholdTestPluginConfig = {
  mode: 'auto',
  intervalMs: 500,
  frameCount: 3,
  strictness: 'normal',
  thresholds: thresholdsFromNormalized(DEFAULT_NORMALIZED_THRESHOLDS),
  autoRestartDelayMs: 500,
};

export function resolveFftThresholdTestConfig(
  raw: unknown,
): FftThresholdTestPluginConfig {
  const base = defaultFftThresholdTestConfig;
  if (!raw || typeof raw !== 'object') return base;
  const c = raw as Partial<FftThresholdTestPluginConfig>;
  const fc = c.frameCount;
  const frameCount =
    fc === 3 || fc === 5 || fc === 7 || fc === 10 ? fc : base.frameCount;
  return {
    mode: c.mode === 'manual' ? 'manual' : 'auto',
    intervalMs:
      typeof c.intervalMs === 'number' && c.intervalMs > 0
        ? c.intervalMs
        : base.intervalMs,
    frameCount,
    strictness:
      c.strictness === 'easy' || c.strictness === 'strict'
        ? c.strictness
        : c.strictness === 'normal'
          ? 'normal'
          : base.strictness,
    thresholds: {
      centroid: { ...base.thresholds.centroid, ...c.thresholds?.centroid },
      flux: { ...base.thresholds.flux, ...c.thresholds?.flux },
      rms: { ...base.thresholds.rms, ...c.thresholds?.rms },
    },
    autoRestartDelayMs:
      typeof c.autoRestartDelayMs === 'number' && c.autoRestartDelayMs >= 0
        ? c.autoRestartDelayMs
        : base.autoRestartDelayMs,
  };
}

export const STRICTNESS_LABELS: Record<StrictnessLevel, string> = {
  easy: 'Лёгкий',
  normal: 'Средний',
  strict: 'Строгий',
};
