import { describe, expect, it } from 'vitest';

import { BOARD_USERCASE_PICKER_A11Y } from './board-usercase-picker-modal.js';

describe('board-usercase-picker-modal a11y', () => {
  it('exposes stable aria ids for dialog labels and descriptions', () => {
    expect(BOARD_USERCASE_PICKER_A11Y.titleId).toBe('board-usercase-picker-title');
    expect(BOARD_USERCASE_PICKER_A11Y.descId).toBe('board-usercase-picker-desc');
    expect(BOARD_USERCASE_PICKER_A11Y.dirtyTitleId).toBe('board-usercase-dirty-title');
    expect(BOARD_USERCASE_PICKER_A11Y.dirtyDescId).toBe('board-usercase-dirty-desc');
  });
});
