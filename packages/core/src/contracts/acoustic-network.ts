/**
 * Контракты сетевого этапа (TDOA, синхронизация).
 * @experimental @stage 2 — см. WHITE_PAPER.md § Stage-gate 1→2; активная разработка заморожена.
 */

import type { Id } from '../types/index.js';

/**
 * Временная метка с привязкой к глобальной шкале узла.
 * @experimental @stage 2
 */
export interface SyncedTimestamp {
  readonly localMs: number;
  readonly globalMs: number;
  readonly confidence: number;
}

/**
 * Провайдер калибровки смещения часов узла.
 * @experimental @stage 2
 */
export interface TimeSyncProvider {
  calibrate(nodeId: Id): Promise<number>;
}

/**
 * Результат оценки TDOA между двумя наблюдениями.
 * @experimental @stage 2
 */
export interface TdoaResult {
  readonly deltaMs: number;
  readonly confidence: number;
}
