import { type DeviceScenarioDocument } from '@membrana/core';

import { getDetectionAlarmBetaDocument } from './usercase-detection-alarm-beta.js';

/**
 * FREE-tier «+1» UserCase: combined-детекция + alarm-loop (**DSP fusion**).
 *
 * Консилиум `s2-combined-uc-dsp-2026-07-12` (LGTM, вариант A DSP-only):
 * S2 combined UC — bundled FREE-шаблон поверх готового `loop-transition-policy` (#357).
 * Базовый граф v1 = **проверенная DSP-пара** (winner Beta: ensemble+trends →
 * make-detection-fusion → branch-on-detection(0.5) → combined-report + alarm-loop
 * с proximity-trend). Собран из зарегистрированных basn-узлов, новых node-типов НЕ вводит.
 *
 * DSP-only: combinedScore сливает СПЕКТРАЛЬНЫЕ модальности (trends+ensemble), без нейро.
 * Живой yamnet в combined — отложен (`insight-live-neural-combined-detector`, deferred).
 *
 * Отличие от community-пресета Beta — уровень каталога (bundled FREE-шаблон против
 * именованного competition-форка); базовый документ v1 намеренно берёт проверенный
 * Beta-граф, дальнейшая FREE-специализация — в S3-упаковке.
 */
export function getFreeCombinedAlarmDocument(): DeviceScenarioDocument {
  return getDetectionAlarmBetaDocument();
}
