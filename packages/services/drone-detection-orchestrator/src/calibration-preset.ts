import type { AnalyzeSampleOptions } from '@membrana/detector-base';

/**
 * Train-tuned sample aggregation presets (VDR4).
 *
 * СГЕНЕРИРОВАНО — не редактировать руками.
 * Источник: `data/detectors-benchmark/v0.2/calibration-preset.json`
 * Генератор: `node scripts/generate-calibration-preset-ts.mjs`
 *
 * Владелец истины — JSON (выход `scripts/calibrate-detectors.mjs`); эта
 * константа производна от него (ADR-0006 Р2). Правка здесь будет затёрта
 * и уронит `scripts/calibration-preset-sync.test.mjs`.
 */
export const CALIBRATED_SAMPLE_OPTIONS: Record<string, AnalyzeSampleOptions> = {
  cepstral: { aggregation: 'any-frame', sampleConfidenceThreshold: 0 },
  harmonic: { aggregation: 'any-frame', sampleConfidenceThreshold: 0 },
  'spectral-flux': { aggregation: 'majority', sampleConfidenceThreshold: 0 },
};
