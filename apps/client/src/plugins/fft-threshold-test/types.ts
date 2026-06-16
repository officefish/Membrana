import type {
  StrictnessLevel,
  ThresholdTestFrameCount,
  ThresholdTestThresholds,
} from '@membrana/fft-analyzer-service';

import type { AnalysisSourceKind } from '../../lib/audioAnalysis';
import { DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS } from '../../lib/droneTightCalibration';

export const FFT_THRESHOLD_TEST_PLUGIN_ID = 'fft-threshold-test';

/**
 * Целевой nodeKind для device-board D1:
 * category: 'analyzer', inputs: AudioFrame, outputs: Detection | FftMetrics
 */
export interface FftThresholdTestPluginConfig {
  readonly mode: 'manual' | 'auto';
  readonly intervalMs: number;
  readonly frameCount: ThresholdTestFrameCount;
  readonly strictness: StrictnessLevel;
  readonly thresholds: ThresholdTestThresholds;
  readonly autoRestartDelayMs: number;
  readonly analysisSource: AnalysisSourceKind;
}

export const defaultFftThresholdTestConfig: FftThresholdTestPluginConfig = {
  mode: 'auto',
  intervalMs: DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS.intervalMs,
  frameCount: DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS.frameCount,
  strictness: DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS.strictness,
  thresholds: { ...DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS.thresholds },
  autoRestartDelayMs: 500,
  analysisSource: 'microphone',
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
    analysisSource:
      c.analysisSource === 'sample-library' || c.analysisSource === 'graph'
        ? c.analysisSource
        : 'microphone',
  };
}

export function fftThresholdDroneSourceId(analysisSource: AnalysisSourceKind): string {
  return analysisSource === 'sample-library'
    ? `${FFT_THRESHOLD_TEST_PLUGIN_ID}-sample`
    : FFT_THRESHOLD_TEST_PLUGIN_ID;
}

export const STRICTNESS_LABELS: Record<StrictnessLevel, string> = {
  easy: 'Лёгкий',
  normal: 'Средний',
  strict: 'Строгий',
};
