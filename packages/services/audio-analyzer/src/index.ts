/**
 * @membrana/audio-analyzer-service — публичное API.
 *
 * Единственная точка входа. Всё, что не реэкспортировано отсюда, — приватно.
 *
 * См. docs/SERVICES.md для архитектурных правил.
 */

// ============= Главный класс (engine) =============
export { AudioAnalyzer } from './core/audio-analyzer.js';

// ============= Хелперы engine-слоя =============
export {
  createAudioContext,
  loadAudioBuffer,
  checkMicrophonePermission,
  getAudioInputDevices,
} from './core/audio-helpers.js';

// ============= Чистая математика (pure) =============
export { FftCore } from './math/fft.js';
export {
  SpectralFluxTracker,
  spectralCentroid,
  rms,
  lowEnergyPercent,
  stabilityFromFlux,
  applyFrequencyFilter,
  zeroCrossingRate,
  spectralRolloff,
  spectralFlatness,
} from './math/metrics.js';
export { mean, std, minOf, maxOf, summarize } from './math/statistics.js';

// ============= React-хуки =============
export {
  useAudioAnalyzer,
  type UseAudioAnalyzerOptions,
  type UseAudioAnalyzerReturn,
} from './hooks/use-audio-analyzer.js';
export {
  useFileAnalyzer,
  type UseFileAnalyzerOptions,
  type UseFileAnalyzerReturn,
} from './hooks/use-file-analyzer.js';
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
