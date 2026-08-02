export type {
  AudioWindow,
  DetectionMetrics,
  DetectionResult,
  DetectorFamily,
  DroneDetector,
} from './types.js';
export { audioWindowFromFrame } from './types.js';
export {
  analyzeSample,
  DEFAULT_ANALYZE_FFT_SIZE,
  DEFAULT_ANALYZE_HOP_RATIO,
} from './analyze-sample.js';
export type {
  AnalyzeSampleOptions,
  AnalyzeSampleResult,
  SampleAggregationMode,
  SampleDetectionVerdict,
  SampleFrameVerdict,
} from './analyze-sample.js';
/**
 * Механика окна наружу. Архитектор 02.08 предлагал НЕ экспортировать её: потребителей три, все
 * внутри монорепы, а публикация замораживает сигнатуру раньше, чем понадобится — и советовал
 * оставить импорт относительным путём внутри пакета.
 *
 * Исполнено не было, и причина фактическая: три потребителя — это три ДРУГИХ пакета
 * (`harmonic`, `cepstral`, `spectral-flux`), а относительный путь через границу пакета не
 * ведёт. Без экспорта свод четырёх копий в один носитель невозможен вовсе.
 *
 * Его опасение записано как долг, а не отвергнуто: если сигнатура окажется тесной (умолчание
 * шага, отдача метки времени, стратегия хвоста) — менять придётся уже с оглядкой на публичность.
 */
export {
  averageMagnitudes,
  fftFrames,
  geometricMeanMagnitudes,
  prepareFftSamples,
} from './sample-window.js';
export { NotImplementedError } from './errors.js';
export { createMockDroneDetector } from './mock-detector.js';
export {
  harmonicDroneWindow,
  sineWindow,
  whiteNoiseWindow,
} from './test-fixtures.js';
