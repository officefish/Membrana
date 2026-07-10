import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDefaultMvpMicrophoneDocument } from '../graph/default-usercase-mvp-microphone.js';
import { COMMUNITY_COMPETITION_USER_CASE_ENTRIES } from './community-competition-user-case-entries.js';
import { DETECTION_ALARM_COMPETITION_USER_CASE_ENTRIES } from './detection-alarm-competition-user-case-entries.js';
import { FREE_TIER_USER_CASE_ENTRIES } from './free-tier-user-case-entries.js';

/**
 * Active bundled UserCase entries (runtime catalog picker).
 * FREE-tier scaffold: `free-tier-user-case-entries.ts` (Задача E, каркас 3+1 UC).
 * Competition forks: `community-competition-user-case-entries.ts` (yarn comp:publish-catalog),
 * `detection-alarm-competition-user-case-entries.ts` (comp-detection-alarm-2026-07-10).
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
  ...DETECTION_ALARM_COMPETITION_USER_CASE_ENTRIES,
];
