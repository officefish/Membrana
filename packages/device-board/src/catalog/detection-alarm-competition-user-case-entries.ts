import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import {
  DETECTION_ALARM_GAMMA_USER_CASE_ID,
  getDetectionAlarmGammaDocument,
} from '../graph/default-usercase-detection-alarm-gamma.js';

/**
 * Competition Sprint `comp-detection-alarm-2026-07-10` — team fork(и) полного
 * детекционного UserCase (combined + alarm-loop) в пикере, `tier: community`.
 * Финальный состав трёх команд соберёт `yarn comp:publish-catalog` на Phase 5b;
 * до этого ветка команды несёт только свой entry.
 */
export const DETECTION_ALARM_COMPETITION_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
  {
    id: DETECTION_ALARM_GAMMA_USER_CASE_ID,
    title: 'Gamma · Detection + Alarm (прозрачный сценарий)',
    description:
      'Полный детекционный сценарий-плакат ①–⑥: два DSP-детектора (FFT-trends + ансамбль, без нейро) → fusion → branch; на детекции — трек и единый combined-отчёт асинхронно; тревога «ближе/дальше» до потери дистанции. Print в каждой ключевой точке.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 0,
    loadDocument: getDetectionAlarmGammaDocument,
  },
];
