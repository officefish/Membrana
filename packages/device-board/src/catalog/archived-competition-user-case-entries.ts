/**
 * Архивные competition UserCase (comp-mvp-packaging v1).
 * Не показываются в picker; сохранены для rebuild и истории.
 */
import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDefaultMvpMicrophoneAlphaDocument } from '../graph/default-usercase-mvp-microphone-alpha.js';
import { getDefaultMvpMicrophoneBetaDocument } from '../graph/default-usercase-mvp-microphone-beta.js';
import { getDefaultMvpMicrophoneGammaDocument } from '../graph/default-usercase-mvp-microphone-gamma.js';

/** Sprint `comp-mvp-packaging-2026-06-21` — archived 2026-06-25. */
export const ARCHIVED_COMPETITION_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
  {
    id: 'usercase-mvp-microphone-alpha',
    title: 'Alpha: Live Observation Pipeline (archived)',
    description:
      'Competition v1 Team Alpha — operator journey, RU comment groups. Archived; see docs/archive/competition-sprint/.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 3,
    loadDocument: getDefaultMvpMicrophoneAlphaDocument,
  },
  {
    id: 'usercase-mvp-microphone-beta',
    title: 'Beta: Measured modular UserCase (archived)',
    description: 'Competition v1 Team Beta — 3 modular functions. Archived.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 3,
    loadDocument: getDefaultMvpMicrophoneBetaDocument,
  },
  {
    id: 'usercase-mvp-microphone-gamma',
    title: 'Gamma: Poster UserCase (archived)',
    description: 'Competition v1 Team Gamma — poster layout ①–⑤. Archived.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 2,
    loadDocument: getDefaultMvpMicrophoneGammaDocument,
  },
];
