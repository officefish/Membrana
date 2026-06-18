import { describe, expect, it } from 'vitest';

import { isNodeLimitReached, nextNodeLabel } from './node-limit';

describe('isNodeLimitReached', () => {
  it('allows creating up to the tariff limit', () => {
    expect(isNodeLimitReached(0, 2)).toBe(false);
    expect(isNodeLimitReached(1, 2)).toBe(false);
  });

  it('rejects creating beyond the tariff limit', () => {
    expect(isNodeLimitReached(2, 2)).toBe(true);
    expect(isNodeLimitReached(3, 2)).toBe(true);
  });

  it('treats limit of 1 as single-node', () => {
    expect(isNodeLimitReached(0, 1)).toBe(false);
    expect(isNodeLimitReached(1, 1)).toBe(true);
  });
});

describe('nextNodeLabel', () => {
  it('numbers labels 1-based by current count', () => {
    expect(nextNodeLabel(0)).toBe('Узел 1');
    expect(nextNodeLabel(1)).toBe('Узел 2');
  });
});
