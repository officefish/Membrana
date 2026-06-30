/**
 * Контракты сетевого этапа (TDOA, синхронизация).
 * @experimental @stage 2 — см. WHITE_PAPER.md § Stage-gate 1→2; активная разработка заморожена.
 */

import type { Id } from '../types/index.js';

/**
 * Источник синхронизации времени узла.
 * @experimental @stage 2
 */
export type TimeSyncSource =
  | 'gps-pps'
  | 'ptp'
  | 'ntp'
  | 'manual'
  | 'synthetic';

/**
 * Временная метка с привязкой к глобальной шкале узла.
 * @experimental @stage 2
 */
export interface SyncedTimestamp {
  readonly localMs: number;
  readonly globalMs: number;
  readonly offsetMs?: number;
  readonly jitterMs?: number;
  readonly uncertaintyMs?: number;
  readonly source?: TimeSyncSource;
  readonly calibratedAtMs?: number;
  readonly validUntilMs?: number;
  readonly confidence: number;
}

/**
 * Наблюдение акустического события на одном узле с привязкой ко времени.
 * @experimental @stage 2
 */
export interface SyncedAcousticObservation {
  readonly id: Id;
  readonly nodeId: Id;
  readonly eventId?: Id;
  readonly timestamp: SyncedTimestamp;
  readonly detectionConfidence?: number;
  readonly snrDb?: number;
  readonly frequencyBandHz?: readonly [number, number];
  readonly sourceClass?: 'drone' | 'machine_hum' | 'unknown' | string;
}

/**
 * Провайдер калибровки смещения часов узла.
 * @experimental @stage 2
 */
export interface TimeSyncProvider {
  calibrate(nodeId: Id): Promise<number>;
}

/**
 * Геометрия узла в локальной системе координат.
 * @experimental @stage 2
 */
export interface AcousticNodeGeometry {
  readonly nodeId: Id;
  readonly frameId: string;
  readonly xMeters: number;
  readonly yMeters: number;
  readonly zMeters?: number;
  readonly positionAccuracyMeters?: number;
  readonly role?: 'fixed' | 'mobile' | 'reference';
}

/**
 * Метод оценки задержки между двумя наблюдениями.
 * @experimental @stage 2
 */
export type TdoaEstimationMethod =
  | 'cross-correlation'
  | 'gcc-phat'
  | 'spectral-anchor'
  | 'manual'
  | 'synthetic';

/**
 * Диагностика качества оценки TDOA.
 * @experimental @stage 2
 */
export interface TdoaQualityDiagnostics {
  readonly peakRatio?: number;
  readonly searchWindowMs?: number;
  readonly warnings?: readonly string[];
}

/**
 * Результат оценки TDOA между двумя наблюдениями.
 * @experimental @stage 2
 */
export interface TdoaResult {
  readonly id?: Id;
  readonly nodeAId?: Id;
  readonly nodeBId?: Id;
  readonly observationAId?: Id;
  readonly observationBId?: Id;
  readonly deltaMs: number;
  readonly uncertaintyMs?: number;
  readonly confidence: number;
  readonly method?: TdoaEstimationMethod;
  readonly quality?: TdoaQualityDiagnostics;
}

/**
 * Ошибки и предупреждения локализации.
 * @experimental @stage 3
 */
export type LocalizationFailureCode =
  | 'insufficient-nodes'
  | 'mixed-frame'
  | 'ill-conditioned-geometry'
  | 'high-residual'
  | 'low-confidence-tdoa'
  | 'out-of-bounds';

/**
 * 2D-эллипс неопределённости локализации.
 * @experimental @stage 3
 */
export interface LocalizationErrorEllipse {
  readonly majorAxisMeters: number;
  readonly minorAxisMeters: number;
  readonly rotationRadians: number;
}

/**
 * Гипотеза положения источника по TDOA-парам.
 * @experimental @stage 3
 */
export interface LocalizationHypothesis {
  readonly id?: Id;
  readonly frameId: string;
  readonly xMeters: number;
  readonly yMeters: number;
  readonly zMeters?: number;
  readonly confidence: number;
  readonly errorEllipse?: LocalizationErrorEllipse;
  readonly residualMs?: number;
  readonly usedTdoaResultIds?: readonly Id[];
  readonly warnings?: readonly LocalizationFailureCode[];
}

/**
 * Вход будущего localizer-service.
 * @experimental @stage 3
 */
export interface MultilaterationInput {
  readonly frameId: string;
  readonly nodes: readonly AcousticNodeGeometry[];
  readonly tdoaResults: readonly TdoaResult[];
  readonly speedOfSoundMetersPerSecond: number;
}
