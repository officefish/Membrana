import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDefaultMvpMicrophoneDocument } from '../graph/default-usercase-mvp-microphone.js';
import {
  DETECTION_ALARM_BETA_USER_CASE_ID,
  getDetectionAlarmBetaDocument,
} from '../graph/usercase-detection-alarm-beta.js';
import { COMMUNITY_COMPETITION_USER_CASE_ENTRIES } from './community-competition-user-case-entries.js';
import { FREE_TIER_USER_CASE_ENTRIES } from './free-tier-user-case-entries.js';

/**
 * Team Beta · comp-detection-alarm-2026-07-10: полный детекционный UserCase
 * (два DSP-детектора → fusion → combined-отчёт async + proximity alarm-loop).
 * Честное описание: DSP-ансамбль, не нейро (yamnet ждёт model-provider).
 */
export const DETECTION_ALARM_BETA_USER_CASE_ENTRY: UserCaseCatalogEntry = {
  id: DETECTION_ALARM_BETA_USER_CASE_ID,
  title: 'Beta: Measured detection + alarm (DSP fusion)',
  description:
    'Полный детекционный сценарий: trends (DRONE_TIGHT) + DSP-ансамбль → fusion (порог 0.55), единый combined-отчёт с треком уходит async (report-build), alarm-loop следит за дистанцией и выходит по потере цели (proximity lost). Деривация bundled MVP v2.0-async.',
  deviceKind: 'microphone',
  tier: 'community',
  layoutProfile: 'exec-lr-v1',
  branchCount: 6,
  functionCount: 2,
  loadDocument: getDetectionAlarmBetaDocument,
};

/**
 * Active bundled UserCase entries (runtime catalog picker).
 * FREE-tier scaffold: `free-tier-user-case-entries.ts` (Задача E, каркас 3+1 UC).
 * Competition forks: `community-competition-user-case-entries.ts` (yarn comp:publish-catalog).
 * Historical loaders: `archived-competition-user-case-entries.ts`.
 */
export const BUNDLED_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
  {
    id: 'usercase-mvp-microphone',
    title: 'MVP microphone: realtime observation + recording gate v2.0-async',
    description:
      'Bundled reference UserCase: six handlers, latent Sequence gate, async track-upload, sync trends publish, detached drone report.',
    deviceKind: 'microphone',
    tier: 'bundled',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 2,
    preview: {
      branchStats: {
        onConnect: { nodeCount: 4, edgeCount: 5 },
        initial: { nodeCount: 9, edgeCount: 13 },
        main: { nodeCount: 32, edgeCount: 51 },
        alarm: { nodeCount: 2, edgeCount: 1 },
        onStop: { nodeCount: 5, edgeCount: 3 },
        onDisconnect: { nodeCount: 4, edgeCount: 3 },
      },
    },
    loadDocument: getDefaultMvpMicrophoneDocument,
  },
  ...FREE_TIER_USER_CASE_ENTRIES,
  ...COMMUNITY_COMPETITION_USER_CASE_ENTRIES,
  DETECTION_ALARM_BETA_USER_CASE_ENTRY,
];
