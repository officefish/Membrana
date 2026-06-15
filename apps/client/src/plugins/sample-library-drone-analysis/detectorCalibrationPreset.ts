import type { AnalyzeSampleOptions } from '@membrana/detector-base';

/**
 * Train-tuned sample aggregation presets (VDR4).
 * Source: `data/detectors-benchmark/v0.2/calibration-preset.json`
 */
export const CALIBRATED_SAMPLE_OPTIONS: Record<string, AnalyzeSampleOptions> = {
  harmonic: { aggregation: 'any-frame', sampleConfidenceThreshold: 0 },
  cepstral: { aggregation: 'any-frame', sampleConfidenceThreshold: 0 },
  'spectral-flux': { aggregation: 'majority', sampleConfidenceThreshold: 0 },
};
