import { describe, expect, it } from 'vitest';

import { BOARD_WORKSPACE_PICKER_A11Y } from './board-workspace-picker-modal.js';

describe('board-workspace-picker-modal a11y', () => {
  it('exposes stable aria ids for dialog labels and descriptions', () => {
    expect(BOARD_WORKSPACE_PICKER_A11Y.titleId).toBe('board-workspace-picker-title');
    expect(BOARD_WORKSPACE_PICKER_A11Y.descId).toBe('board-workspace-picker-desc');
    expect(BOARD_WORKSPACE_PICKER_A11Y.dirtyTitleId).toBe('board-workspace-dirty-title');
    expect(BOARD_WORKSPACE_PICKER_A11Y.dirtyDescId).toBe('board-workspace-dirty-desc');
  });
});
