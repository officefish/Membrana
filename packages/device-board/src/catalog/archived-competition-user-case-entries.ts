/**
 * Архивные competition UserCase.
 * Не показываются в picker; сохранены для rebuild и истории.
 */
import type { UserCaseCatalogEntry } from './user-case-catalog-types.js';
import { getDefaultMvpMicrophoneAlphaDocument } from '../graph/default-usercase-mvp-microphone-alpha.js';
import { getDefaultMvpMicrophoneBetaDocument } from '../graph/default-usercase-mvp-microphone-beta.js';
import { getDefaultMvpMicrophoneGammaDocument } from '../graph/default-usercase-mvp-microphone-gamma.js';
import { getDefaultMvpMicrophoneAlphaAsyncV2Document } from '../graph/default-usercase-mvp-microphone-alpha-async-v2.js';
import { getDefaultMvpMicrophoneBetaAsyncV2Document } from '../graph/default-usercase-mvp-microphone-beta-async-v2.js';
import { getDefaultMvpMicrophoneGammaAsyncV2Document } from '../graph/default-usercase-mvp-microphone-gamma-async-v2.js';

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

/** Sprint `comp-mvp-async-v2-2026-06-25` — archived at closure 2026-06-25. */
export const ARCHIVED_COMPETITION_ASYNC_V2_USER_CASE_ENTRIES: readonly UserCaseCatalogEntry[] = [
  {
    id: 'usercase-mvp-microphone-alpha-async-v2',
    title: 'Alpha: Live Observation Pipeline async v2 (archived)',
    description:
      'Competition async v2 Team Alpha — Act IIb narrative, StartAsyncJob on main. Archived; winner polish on beta.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 4,
    loadDocument: getDefaultMvpMicrophoneAlphaAsyncV2Document,
  },
  {
    id: 'usercase-mvp-microphone-beta-async-v2',
    title: 'Beta: Measured modular async v2 (archived · winner)',
    description:
      'Competition async v2 winner — fn-beta-async-upload-pipeline + cherry-pick ⑤⑥ titles.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 3,
    loadDocument: getDefaultMvpMicrophoneBetaAsyncV2Document,
  },
  {
    id: 'usercase-mvp-microphone-gamma-async-v2',
    title: 'Gamma: Poster async v2 (archived)',
    description: 'Competition async v2 Team Gamma — poster ①–⑥. Archived.',
    deviceKind: 'microphone',
    tier: 'community',
    layoutProfile: 'exec-lr-v1',
    branchCount: 6,
    functionCount: 3,
    loadDocument: getDefaultMvpMicrophoneGammaAsyncV2Document,
  },
];
