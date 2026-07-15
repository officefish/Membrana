import { type DeviceScenarioDocument } from '@membrana/core';

import { getDetectionAlarmBetaDocument } from './usercase-detection-alarm-beta.js';
import { stripCompetitionDocumentMeta } from './execution-policy.js';

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
 *
 * Meta: competition-штамп Beta СНИМАЕТСЯ (`stripCompetitionDocumentMeta`). FREE-UC
 * не competition-форк, а `executionPolicy: 'competition'` включил бы
 * `isCompetitionStructureLocked` и заблокировал правку структуры бесплатного
 * сценария (баг FREE-лайнапа, cowork #487 RETROSPECTIVE). Донор Beta не мутируется —
 * снятие клонирует meta; competition-каталог использует Beta напрямую и штамп сохраняет.
 */
let cachedDocument: DeviceScenarioDocument | null = null;

export function getFreeCombinedAlarmDocument(): DeviceScenarioDocument {
  if (cachedDocument === null) {
    cachedDocument = stripCompetitionDocumentMeta(getDetectionAlarmBetaDocument());
  }
  return cachedDocument;
}
