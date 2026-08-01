/**
 * Точка сборки детекторов.
 *
 * Шов с корневым индексом закрыт 01.08: `src/index.ts` реэкспортирует всё перечисленное
 * ниже поимённо, и труба с трендом доступны потребителям пакета. Прежде реэкспорта не было
 * не по забывчивости — корневой индекс был зоной соседнего блока `mfcc-core-wrapper`, и
 * блок `mfcc-detectors` назвал шов вместо того, чтобы писать за свою границу.
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
