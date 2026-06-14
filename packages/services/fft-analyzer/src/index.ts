/**
 * @membrana/fft-analyzer-service — публичное API.
 *
 * Зависит от @membrana/audio-engine-service: engine поставляет кадры,
 * а этот сервис применяет FFT и считает метрики.
 *
 * См. docs/SERVICES.md.
 */

// ============= Главный класс (математика) =============
export { FftAnalyzer } from './core/fft-analyzer.js';

/** @deprecated Используй FftAnalyzer. */
export { AudioAnalyzer } from './core/audio-analyzer.js';

// ============= Чистая математика =============
export { FftCore } from './math/fft.js';
export {
  SpectralFluxTracker,
  spectralFluxL2,
  SPECTRAL_FLUX_BYTE_SCALE,
  SPECTRAL_FLUX_L2_DIVISOR,
  spectralCentroid,
  rms,
  frameLoudness,
  lowEnergyPercent,
  stabilityFromFlux,
  applyFrequencyFilter,
  zeroCrossingRate,
  spectralRolloff,
  spectralFlatness,
} from './math/metrics.js';
export { mean, std, minOf, maxOf, summarize } from './math/statistics.js';
export {
  estimateNoiseFloor,
  evaluateSoundQuality,
  soundQualityBadge,
  soundQualityHint,
  type SoundQualityBadge,
  type SoundQualityBadgeTone,
  type SoundQualityInput,
  type SoundQualityMetrics,
  type SoundQualityOptions,
  type SoundQualityWeights,
} from './math/sound-quality.js';
export {
  THRESHOLD_TEST_FRAME_COUNTS,
  evaluateFrameVerdict,
  evaluateThresholdTest,
  isThresholdTestFrameCount,
  minPassRateForStrictness,
  type FrameMetrics,
  type FrameVerdict,
  type StrictnessLevel,
  type ThresholdBounds,
  type ThresholdTestFrameCount,
  type ThresholdTestMode,
  type ThresholdTestResult,
  type ThresholdTestThresholds,
} from './math/threshold-test.js';

// ============= React-хуки =============
export {
  useFftAnalyzer,
  type UseFftAnalyzerOptions,
  type UseFftAnalyzerReturn,
} from './hooks/use-fft-analyzer.js';
export {
  useFftFileAnalyzer,
  type UseFftFileAnalyzerOptions,
  type UseFftFileAnalyzerReturn,
} from './hooks/use-fft-file-analyzer.js';
export {
  useFftMicrophoneAnalyzer,
  type UseFftMicrophoneAnalyzerOptions,
  type UseFftMicrophoneAnalyzerReturn,
} from './hooks/use-fft-microphone-analyzer.js';

/** @deprecated Используй useFftAnalyzer / useFftFileAnalyzer / useFftMicrophoneAnalyzer. */
export {
  useAudioAnalyzer,
  type UseAudioAnalyzerOptions,
  type UseAudioAnalyzerReturn,
} from './hooks/use-audio-analyzer.js';
/** @deprecated */
export {
  useFileAnalyzer,
  type UseFileAnalyzerOptions,
  type UseFileAnalyzerReturn,
} from './hooks/use-file-analyzer.js';
/** @deprecated */
export {
  useMicrophoneAnalyzer,
  type UseMicrophoneAnalyzerOptions,
  type UseMicrophoneAnalyzerReturn,
} from './hooks/use-microphone-analyzer.js';

// ============= Конфигурация и пресеты =============
export { DEFAULT_CONFIG, PRESETS, applyPreset } from './constants.js';

// ============= Типы =============
export type {
  AudioAnalyzerConfig,
  DetectionThresholds,
  LiveModeConfig,
  FrequencyRange,
  AdvancedAnalysisConfig,
  LiveFrameResult,
  FileAnalysisResult,
  AnalysisStatistics,
  MetricStats,
  CompleteTemporalPatterns,
  TrendType,
  StabilityLevel,
  PeriodicityType,
  EnvelopeShape,
  AnalysisEvent,
  AnalysisEventMap,
  AnalysisListener,
} from './types.js';
