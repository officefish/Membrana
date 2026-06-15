import { describe, expect, it } from 'vitest';

import { clampPlaybackOffset } from './playback-offset.js';

describe('clampPlaybackOffset', () => {
  it('clamps to duration', () => {
    expect(clampPlaybackOffset(5, 3)).toBe(3);
    expect(clampPlaybackOffset(-1, 3)).toBe(0);
    expect(clampPlaybackOffset(1.5, 3)).toBe(1.5);
  });

  it('returns 0 for non-positive duration', () => {
    expect(clampPlaybackOffset(2, 0)).toBe(0);
  });
});
