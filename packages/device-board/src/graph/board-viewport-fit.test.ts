import { describe, expect, it } from 'vitest';

import { isBoardLayoutGhostNodeId } from './board-viewport-fit.js';

describe('isBoardLayoutGhostNodeId', () => {
  it('detects layout ghost nodes', () => {
    expect(isBoardLayoutGhostNodeId('layout-ghost-1')).toBe(true);
    expect(isBoardLayoutGhostNodeId('fn-input')).toBe(false);
  });
});
