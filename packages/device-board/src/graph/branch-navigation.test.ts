import { describe, expect, it } from 'vitest';

import {
  inFunctionLayerRevertPolicy,
  planBranchNavigation,
  sidebarHandlerRevertPolicy,
} from './branch-navigation.js';

describe('branch-navigation', () => {
  it('sidebar handler switch uses revert-if-dirty', () => {
    const plan = planBranchNavigation('main', 'alarm', sidebarHandlerRevertPolicy());
    expect(plan.shouldRevertIfDirty).toBe(true);
    expect(plan.undoClearReason).toBe('switch-handler-branch');
    expect(plan.shouldChangeBranch).toBe(true);
  });

  it('intra-function navigation keeps dirty', () => {
    const plan = planBranchNavigation('function', 'function', inFunctionLayerRevertPolicy());
    expect(plan.shouldRevertIfDirty).toBe(false);
    expect(plan.undoClearReason).toBeNull();
    expect(plan.shouldChangeBranch).toBe(false);
  });

  it('handler to function first entry reverts and clears undo', () => {
    const plan = planBranchNavigation('main', 'function', sidebarHandlerRevertPolicy());
    expect(plan.shouldRevertIfDirty).toBe(true);
    expect(plan.undoClearReason).toBe('enter-function-body');
  });

  it('collapse entry to function keeps dirty', () => {
    const plan = planBranchNavigation('main', 'function', inFunctionLayerRevertPolicy());
    expect(plan.shouldRevertIfDirty).toBe(false);
    expect(plan.undoClearReason).toBe('enter-function-body');
  });
});
