import { describe, expect, it } from 'vitest';

import { shouldThrottle } from './throttle.js';

describe('shouldThrottle', () => {
  it('blocks calls inside interval', () => {
    expect(shouldThrottle(100, 50, 120)).toBe(true);
    expect(shouldThrottle(100, 50, 160)).toBe(false);
  });
});
