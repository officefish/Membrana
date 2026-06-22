import type { ScenarioBranchTab } from '../types/board-ui.js';
import { resolveBranchNavigationUndoClearReason } from './edit-step-log.js';

/**
 * Политика F7-revert при смене ветки сценария.
 * - `revert-if-dirty` — sidebar handler tabs, Signal, handler→function (first entry)
 * - `keep-dirty` — fn-1→fn-2, collapse→function, create function on function layer
 */
export type ScenarioRevertPolicy = 'revert-if-dirty' | 'keep-dirty';

export interface BranchNavigationPlan {
  readonly from: ScenarioBranchTab;
  readonly to: ScenarioBranchTab;
  readonly revertPolicy: ScenarioRevertPolicy;
  readonly shouldRevertIfDirty: boolean;
  readonly undoClearReason: string | null;
  readonly shouldChangeBranch: boolean;
}

/** План навигации между ветками scenario graph. */
export function planBranchNavigation(
  from: ScenarioBranchTab,
  to: ScenarioBranchTab,
  revertPolicy: ScenarioRevertPolicy,
): BranchNavigationPlan {
  return {
    from,
    to,
    revertPolicy,
    shouldRevertIfDirty: revertPolicy === 'revert-if-dirty',
    undoClearReason: resolveBranchNavigationUndoClearReason(from, to),
    shouldChangeBranch: from !== to,
  };
}

/** Sidebar / handler tab switch — F7 baseline revert. */
export function sidebarHandlerRevertPolicy(): ScenarioRevertPolicy {
  return 'revert-if-dirty';
}

/** In-function navigation (list, collapse, create) — drafts stay in memory. */
export function inFunctionLayerRevertPolicy(): ScenarioRevertPolicy {
  return 'keep-dirty';
}
