import { createEmptyDeviceScenarioDocument } from '@membrana/core';

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
    // «+1» лайнапа: combined UC поверх fusion-ядра (fuseDetectorConfidences) + alarm-loop.
    ...FREE_SCAFFOLD_BASE,
    id: 'usercase-free-combined-alarm',
    title: 'FREE · Combined + alarm-loop: слияние спектр+нейро (каркас)',
    description:
      'Заготовка FREE-UC (+1): слияние сырых confidence trends+yamnet (combined score) и alarm-loop «ближе/дальше». Граф и combined-плагин — содержимое.',
  },
];
