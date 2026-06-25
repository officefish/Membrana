import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDefaultMvpMicrophoneDocument } from '../graph/default-usercase-mvp-microphone.js';

/**
 * Active bundled UserCase entries (runtime catalog picker).
 * Competition v1 forks archived — см. `archived-competition-user-case-entries.ts`.
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
];
