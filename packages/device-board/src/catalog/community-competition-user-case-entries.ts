/**
 * Active competition forks in device-board UserCase picker (`tier: community`).
 *
 * Sprint: `comp-detection-alarm-2026-07-10` (#336) — Phase 5b consolidation
 * (координатор, по WINNER.md/consilium). Прошлый состав (async-v2) сохранён
 * в `archived-competition-user-case-entries.ts`.
 */
import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDetectionAlarmAlphaDocument } from '../graph/usercase-detection-alarm-alpha.js';
import {
  DETECTION_ALARM_BETA_USER_CASE_ID,
  getDetectionAlarmBetaDocument,
} from '../graph/usercase-detection-alarm-beta.js';
import {
  DETECTION_ALARM_GAMMA_USER_CASE_ID,
  getDetectionAlarmGammaDocument,
} from '../graph/default-usercase-detection-alarm-gamma.js';

export const COMMUNITY_COMPETITION_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
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
  {
    id: DETECTION_ALARM_BETA_USER_CASE_ID,
    title: 'Beta: Measured detection + alarm (DSP fusion) · winner',
    description:
      'Полный детекционный сценарий: trends (DRONE_TIGHT) + DSP-ансамбль → fusion (порог 0.55), единый combined-отчёт с треком уходит async (report-build), alarm-loop следит за дистанцией и выходит по потере цели (proximity lost). Деривация bundled MVP v2.0-async.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 2,
    loadDocument: getDetectionAlarmBetaDocument,
  },
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
