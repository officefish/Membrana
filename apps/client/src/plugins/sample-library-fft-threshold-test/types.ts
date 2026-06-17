import type {
  StrictnessLevel,
  ThresholdTestFrameCount,
  ThresholdTestThresholds,
} from '@membrana/fft-analyzer-service';

import { DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS } from '../../lib/droneTightCalibration';

export const SAMPLE_LIBRARY_FFT_THRESHOLD_TEST_PLUGIN_ID =
  'sample-library-fft-threshold-test';

/**
 * Конфиг порогового FFT-теста по сэмплу библиотеки.
 * `analysisSource` фиксирован (всегда sample-library, offline-прогон выбранного сэмпла).
 *
 * Пороги по умолчанию — из калибровки free-v1 (эпик fft-last-chance-calibration,
 * конфиг B: drone-бокс p10–p90). См. docs/datasets/week-2026-06-14/fft-last-chance-report.md.
 */
export interface SampleLibraryFftThresholdTestPluginConfig {
  readonly autoAnalyzeOnEnd: boolean;
  readonly intervalMs: number;
  readonly frameCount: ThresholdTestFrameCount;
  readonly strictness: StrictnessLevel;
  readonly thresholds: ThresholdTestThresholds;
}

export const defaultSampleLibraryFftThresholdTestConfig: SampleLibraryFftThresholdTestPluginConfig =
  {
    autoAnalyzeOnEnd: true,
    intervalMs: DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS.intervalMs,
    frameCount: DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS.frameCount,
    strictness: DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS.strictness,
    thresholds: { ...DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS.thresholds },
  };

export function resolveSampleLibraryFftThresholdTestConfig(
  raw: unknown,
): SampleLibraryFftThresholdTestPluginConfig {
  const base = defaultSampleLibraryFftThresholdTestConfig;
  if (!raw || typeof raw !== 'object') return base;
  const c = raw as Partial<SampleLibraryFftThresholdTestPluginConfig>;
  const fc = c.frameCount;
  const frameCount =
    fc === 3 || fc === 5 || fc === 7 || fc === 10 ? fc : base.frameCount;
  return {
    autoAnalyzeOnEnd:
      typeof c.autoAnalyzeOnEnd === 'boolean' ? c.autoAnalyzeOnEnd : base.autoAnalyzeOnEnd,
    intervalMs:
      typeof c.intervalMs === 'number' && c.intervalMs > 0
        ? c.intervalMs
        : base.intervalMs,
    frameCount,
    strictness:
      c.strictness === 'easy' || c.strictness === 'strict' || c.strictness === 'normal'
        ? c.strictness
        : base.strictness,
    thresholds: {
      centroid: { ...base.thresholds.centroid, ...c.thresholds?.centroid },
      flux: { ...base.thresholds.flux, ...c.thresholds?.flux },
      rms: { ...base.thresholds.rms, ...c.thresholds?.rms },
    },
  };
}
