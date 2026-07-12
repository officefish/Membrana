import { createEmptyDeviceScenarioDocument } from '@membrana/core';

import { getFreeCombinedAlarmDocument } from '../graph/usercase-free-combined-alarm.js';
import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';

/**
 * Каркас 3+1 UserCase FREE-тарифа для device-board (Задача E, подступ к S3).
 *
 * ЗАГОТОВКИ, не содержимое: `loadDocument` отдаёт пустой валидный
 * DeviceScenarioDocument (монтируется, но графа ещё нет). Реальные графы UC —
 * следующее содержимое (combined-плагин + графы сценариев).
 *
 * tier:'bundled' — FREE-UC доступны всем (entitlement 'bundled' → всегда canApply).
 * tier:'tariff' сделал бы их 'locked' до появления sku в entitledTariffSkus
 * (стаб — пустой Set), что неверно для бесплатного лайнапа. Формальная привязка к
 * тарифу — на этапе S3-упаковки.
 *
 * Состав по роадмапу FREE (спектр / нейро / библиотека / combined+alarm-loop):
 * три одиночных модальности + одна combined (использует fuseDetectorConfidences).
 */

/** Общий loader-заглушка: пустой валидный документ для микрофонного UC. */
const loadScaffoldMicrophoneDocument = () => createEmptyDeviceScenarioDocument('microphone');

/** Базовые поля, общие для всех заготовок FREE-лайнапа. */
const FREE_SCAFFOLD_BASE = {
  deviceKind: 'microphone',
  tier: 'bundled',
  layoutProfile: 'exec-lr-v1',
  branchCount: 0,
  functionCount: 0,
  loadDocument: loadScaffoldMicrophoneDocument,
} as const satisfies Partial<UserCaseCatalogEntry>;

export const FREE_TIER_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
  {
    ...FREE_SCAFFOLD_BASE,
    id: 'usercase-free-spectrum-live',
    title: 'FREE · Спектр: живое наблюдение (каркас)',
    description:
      'Заготовка FREE-UC: живой спектр микрофона в наблюдении. Граф сценария добавляется содержимым.',
  },
  {
    ...FREE_SCAFFOLD_BASE,
    id: 'usercase-free-sample-library',
    title: 'FREE · Библиотека сэмплов: разметка и прогон (каркас)',
    description:
      'Заготовка FREE-UC: импорт коллекции, разметка и прогон детекторов по библиотеке. Граф добавляется содержимым.',
  },
  {
    ...FREE_SCAFFOLD_BASE,
    id: 'usercase-free-neuro-detection',
    title: 'FREE · Нейро-детекция (yamnet, каркас)',
    description:
      'Заготовка FREE-UC: zero-shot нейро-детектор yamnet по треку. Граф добавляется содержимым.',
  },
  {
    // «+1» лайнапа: combined UC (DSP fusion) поверх loop-transition-policy (#357).
    // S2 keystone — консилиум s2-combined-uc-dsp (вариант A). Базовый граф = проверенная
    // Beta-пара (trends+ensemble → fusion → branch → combined + alarm-loop), из
    // зарегистрированных basn-узлов. Нейро отложено (insight-live-neural-combined-detector).
    ...FREE_SCAFFOLD_BASE,
    branchCount: 2,
    id: 'usercase-free-combined-alarm',
    title: 'FREE · Combined + alarm-loop (DSP fusion)',
    description:
      'Слияние сырых confidence спектральных детекторов (trends + ensemble) в combinedScore, ' +
      'вход в тревогу по combinedScore ≥ 0.5 и alarm-loop «ближе/дальше» (proximity). ' +
      'DSP-fusion (нейро-модальность — отдельный шаг).',
    loadDocument: getFreeCombinedAlarmDocument,
  },
];
