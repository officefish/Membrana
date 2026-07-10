import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDetectionAlarmAlphaDocument } from '../graph/usercase-detection-alarm-alpha.js';

/**
 * Competition Sprint `comp-detection-alarm-2026-07-10` (#336): полный детекционный
 * UserCase «combined-детекция + alarm-loop» на basn-палитре (#323).
 *
 * Team Alpha fork (`tier: community`). Честность карточки: детекторы — trends-FFT +
 * DSP-ансамбль (не нейро). На Phase 5b форки этого спринта заменят async-v2 записи
 * в `community-competition-user-case-entries.ts`.
 */
export const DETECTION_ALARM_COMPETITION_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
  {
    id: 'usercase-detection-alarm-alpha',
    title: 'Alpha · Детекция + тревога (DSP-ансамбль)',
    description:
      'Полный детекционный сценарий: окно 3 с → два детектора (trends-FFT + DSP-ансамбль) → fusion → combined-отчёт с треком (async report-build/track-upload) + alarm-loop по дистанции до lost. Плоский граф шести актов — читается без документации.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 0,
    loadDocument: getDetectionAlarmAlphaDocument,
  },
];
