import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDefaultMvpMicrophoneDocument } from '../graph/default-usercase-mvp-microphone.js';

/**
 * Bundled UserCase entries (runtime index).
 * Manifest source: docs/device-board-scripts/usercase-<id>/manifest.json
 */
export const BUNDLED_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
  {
    id: 'usercase-mvp-microphone',
    title: 'MVP microphone: realtime observation + recording gate v0.8',
    description:
      'Bundled reference UserCase: six handlers, recording gate v0.8, MakeRecordingPolicy + MakeFftTrendsPolicy, journal trends-fft.',
    deviceKind: 'microphone',
    tier: 'bundled',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 0,
    preview: {
      branchStats: {
        onConnect: { nodeCount: 4, edgeCount: 5 },
        initial: { nodeCount: 9, edgeCount: 13 },
        main: { nodeCount: 27, edgeCount: 54 },
        alarm: { nodeCount: 2, edgeCount: 1 },
        onStop: { nodeCount: 5, edgeCount: 3 },
        onDisconnect: { nodeCount: 4, edgeCount: 3 },
      },
    },
    loadDocument: getDefaultMvpMicrophoneDocument,
  },
];
