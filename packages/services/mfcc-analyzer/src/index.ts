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

/**
 * Детекторы — труба и тренд.
 *
 * Шов, названный блоком `mfcc-detectors` и не перейдённый им: корневой индекс был зоной
 * соседнего блока, и дописывать туда значило писать за свою границу. Цена промедления уже
 * уплачена — прибор 31.07 судил собственной копией счёта, потому что до детектора пакета
 * было не дотянуться.
 *
 * Перечисление поимённо, а не `export *`: наружу выходит объявленный контракт, и новый
 * экспорт внутри `detectors/` не просачивается в публичное имя пакета сам собой.
 */
export {
  boundsProblem,
  corpusProblem,
  cosineOf,
  evaluatePipe,
  evaluateTrend,
  inBounds,
  judgeRun,
  magnitudeOf,
  meanOf,
  ratioProblem,
  refuse,
  type Bounds,
  type DetectorOutcome,
  type DetectorRefusal,
  type MfccTrend,
  type PipeFrameState,
  type PipeFrameVerdict,
  type PipeReport,
  type PipeSpec,
  type RunDemand,
  type TrendReport,
  type TrendSpec,
  type VectorRun,
} from './detectors/index.js';
