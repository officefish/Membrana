/**
 * Re-export общей нормализации для UI порогового теста.
 * @see apps/client/src/lib/fftMetricNormalize.ts
 */
export {
  DEFAULT_NORMALIZED_THRESHOLDS,
  DEMO_DRONE_THRESHOLDS,
  METRIC_NORM,
  clamp01,
  denormalizeCentroidHz,
  denormalizeFlux,
  denormalizeLoudness,
  formatNorm,
  formatRawCentroid,
  formatRawFlux,
  formatRawLoudness,
  normalizeCentroidHz,
  normalizeFlux,
  normalizeLoudness,
  thresholdsFromNormalized,
  thresholdsToNormalized,
  type NormalizedThresholds,
} from '../../lib/fftMetricNormalize';
