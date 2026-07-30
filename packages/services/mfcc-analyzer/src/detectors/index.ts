/**
 * Точка сборки детекторов. Из корня пакета (`src/index.ts`) они пока НЕ реэкспортируются:
 * корневой индекс — зона соседнего блока `mfcc-core-wrapper`, и трогать её из блока
 * `mfcc-detectors` значит писать за свою границу. Шов назван, а не пройден молча.
 */
export {
  boundsProblem,
  corpusProblem,
  cosineOf,
  inBounds,
  judgeRun,
  magnitudeOf,
  meanOf,
  ratioProblem,
  refuse,
  type Bounds,
  type DetectorOutcome,
  type DetectorRefusal,
  type RunDemand,
  type VectorRun,
} from './common.js';

export {
  evaluatePipe,
  type PipeFrameState,
  type PipeFrameVerdict,
  type PipeReport,
  type PipeSpec,
} from './pipe.js';

export { evaluateTrend, type MfccTrend, type TrendReport, type TrendSpec } from './trend.js';
