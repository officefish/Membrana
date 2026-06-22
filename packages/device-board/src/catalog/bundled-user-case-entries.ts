import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDefaultMvpMicrophoneDocument } from '../graph/default-usercase-mvp-microphone.js';
import { getDefaultMvpMicrophoneAlphaDocument } from '../graph/default-usercase-mvp-microphone-alpha.js';
import { getDefaultMvpMicrophoneBetaDocument } from '../graph/default-usercase-mvp-microphone-beta.js';
import { getDefaultMvpMicrophoneGammaDocument } from '../graph/default-usercase-mvp-microphone-gamma.js';

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
  {
    id: 'usercase-mvp-microphone-alpha',
    title: 'Alpha: Live Observation Pipeline',
    description:
      'Competition sprint Team Alpha — operator journey, RU comment groups, gate + observation functions.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 3,
    loadDocument: getDefaultMvpMicrophoneAlphaDocument,
  },
  {
    id: 'usercase-mvp-microphone-beta',
    title: 'Beta: Measured modular UserCase',
    description: 'Competition sprint Team Beta — 3 modular functions, verify-layout metrics.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 3,
    loadDocument: getDefaultMvpMicrophoneBetaDocument,
  },
  {
    id: 'usercase-mvp-microphone-gamma',
    title: 'Gamma: Poster UserCase',
    description: 'Competition sprint Team Gamma — poster layout ①–⑤, gate + trends functions.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 2,
    loadDocument: getDefaultMvpMicrophoneGammaDocument,
  },
];
