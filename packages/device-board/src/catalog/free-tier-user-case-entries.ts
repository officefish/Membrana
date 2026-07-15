import { getFreeCombinedAlarmDocument } from '../graph/usercase-free-combined-alarm.js';
import { getFreeNeuroDetectionDocument } from '../graph/usercase-free-neuro-detection.js';
import { getFreeSampleLibraryDocument } from '../graph/usercase-free-sample-library.js';
import { getFreeSpectrumLiveDocument } from '../graph/usercase-free-spectrum-live.js';
import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';

/**
 * Лайнап 3+1 UserCase FREE-тарифа для device-board (Задача E → cowork-sprint
 * `cowork-free-fragment-usercases` #487).
 *
 * СОДЕРЖИМОЕ: три одиночные модальности (спектр / нейро / записи) — результат
 * коворка (декомпозиция работающего combined-графа, каждый UC — самостоятельный
 * документ-деривация от MVP). Четвёртая — combined + alarm-loop.
 *
 * tier:'bundled' — FREE-UC доступны всем (entitlement 'bundled' → всегда canApply).
 * tier:'tariff' сделал бы их 'locked' до появления sku в entitledTariffSkus
 * (стаб — пустой Set), что неверно для бесплатного лайнапа. Формальная привязка к
 * тарифу — на этапе S3-упаковки.
 *
 * INTERFACE_CONTRACT §5: FREE-шаблоны НЕ несут competition-meta (иначе
 * isCompetitionStructureLocked заблокировал бы правку структуры бесплатного
 * сценария). Три новых UC этого инварианта держатся; combined наследует штамп
 * через Beta — известный долг (см. RETROSPECTIVE).
 */

/** Базовые поля, общие для всех записей FREE-лайнапа (счётчики — per-entry). */
const FREE_SCAFFOLD_BASE = {
  deviceKind: 'microphone',
  tier: 'bundled',
  layoutProfile: 'exec-lr-v1',
  branchCount: 0,
  functionCount: 0,
} as const satisfies Partial<UserCaseCatalogEntry>;

export const FREE_TIER_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
  {
    ...FREE_SCAFFOLD_BASE,
    branchCount: 1,
    functionCount: 2,
    id: 'usercase-free-spectrum-live',
    title: 'FREE · Спектр: живое наблюдение',
    description:
      'Спектральная модальность: живой микрофон → FFT-тренды (MakeFftTrendsAnalysis) → отчёт. ' +
      'Одиночный детектор без слияния и тревоги.',
    loadDocument: getFreeSpectrumLiveDocument,
  },
  {
    ...FREE_SCAFFOLD_BASE,
    branchCount: 1,
    functionCount: 2,
    id: 'usercase-free-sample-library',
    title: 'FREE · Библиотека сэмплов: записи',
    description:
      'Записи звука: окно записи → трек → async-выгрузка → публикация в журнал. ' +
      'Управление коллекцией и разметка — клиентский модуль «Библиотека сэмплов» (вне графа).',
    loadDocument: getFreeSampleLibraryDocument,
  },
  {
    ...FREE_SCAFFOLD_BASE,
    branchCount: 1,
    functionCount: 2,
    id: 'usercase-free-neuro-detection',
    title: 'FREE · Нейро-детекция (yamnet)',
    description:
      'Нейро-модальность: zero-shot yamnet по окну сэмплов → отчёт. Модель недоступна — ' +
      'видимая метка вместо молчаливой деградации. Одиночный детектор без слияния и тревоги.',
    loadDocument: getFreeNeuroDetectionDocument,
  },
  {
    // «+1» лайнапа: combined UC поверх loop-transition-policy (#357).
    // S2 keystone — консилиум s2-combined-uc-dsp (вариант A). Базовый граф = проверенная
    // Beta-пара (trends+ensemble → fusion → branch → combined + alarm-loop), из
    // зарегистрированных basn-узлов. Модальности: ensemble-ветвь включает yamnet
    // (консилиум live-neural-combined-fusion 2026-07-13, мандат владельца) с честным
    // fallback на спектр; топология/пороги НЕ менялись (вердикт точки 5).
    ...FREE_SCAFFOLD_BASE,
    branchCount: 2,
    id: 'usercase-free-combined-alarm',
    title: 'FREE · Combined + alarm-loop (спектр+нейро)',
    description:
      'Слияние сырых confidence детекторов (trends + ensemble, включая нейро yamnet) ' +
      'в combinedScore, вход в тревогу по combinedScore ≥ 0.5 и alarm-loop «ближе/дальше» ' +
      '(proximity). Модальности: спектр+нейро; при недоступной модели — честный fallback на спектр.',
    loadDocument: getFreeCombinedAlarmDocument,
  },
];
