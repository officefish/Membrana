export { HarmonicDetector, createHarmonicDetector } from './core/harmonic-detector.js';
export type { HarmonicDetectorConfig, HarmonicSpectrumResult } from './types.js';
export {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_FFT_SIZE,
  DEFAULT_SAMPLE_RATE,
} from './constants.js';
export { classifySpectrum, DEFAULT_HARMONIC_DETECTOR_CONFIG } from './math/classifier.js';
export { findSpectralPeaks, type SpectralPeak } from './math/peaks.js';
export { scoreHarmonicStack, mergeFundamentals } from './math/harmonics.js';
export { hzToBin, binToHz } from './math/frequencies.js';
