import { describe, expect, it } from 'vitest';

import { isNodeLimitReachedView } from './nodeListView';

describe('isNodeLimitReachedView', () => {
  it('allows adding up to the tariff limit', () => {
    expect(isNodeLimitReachedView(0, 2)).toBe(false);
    expect(isNodeLimitReachedView(1, 2)).toBe(false);
  });

  it('blocks adding at or beyond the limit', () => {
    expect(isNodeLimitReachedView(2, 2)).toBe(true);
    expect(isNodeLimitReachedView(3, 2)).toBe(true);
  });
});
