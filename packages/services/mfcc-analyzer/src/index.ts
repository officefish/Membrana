/**
 * `@membrana/mfcc-analyzer-service` — MFCC-ядро по образцу `@membrana/fft-analyzer-service`.
 *
 * Наружу выходят ТОЛЬКО собственные типы. `meyda` за периметром `core/` не видна: потребитель
 * о ней не знает, и замена библиотеки на другую или на собственный DCT не требует правок вне
 * ядра. Это решение структурщика, а не удобство — проброс чужого типа сделал бы библиотеку
 * частью нашего контракта.
 */
export type {
  AudioWindow,
  MfccConfig,
  MfccExtractor,
  MfccRefusal,
  MfccResult,
  MfccVector,
} from './types.js';

export { configHashOf, configProblem, processWindow } from './core/mfcc-processor.js';
export {
  acceptWindow,
  createEngine,
  reconfigure,
  snapshot,
  type MfccEngineState,
} from './core/mfcc-engine.js';
