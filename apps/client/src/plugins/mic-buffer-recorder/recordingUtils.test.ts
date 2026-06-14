import { describe, expect, it } from 'vitest';

import { clampManualTargetSec } from './recordingUtils';
import { MAX_MANUAL_DURATION_SEC } from './types';

describe('recordingUtils', () => {
  it('clamps manual preset to 30 seconds max', () => {
    expect(clampManualTargetSec(30)).toBe(30);
    expect(clampManualTargetSec(45)).toBe(MAX_MANUAL_DURATION_SEC);
    expect(clampManualTargetSec(7)).toBe(7);
  });

  it('falls back for invalid preset values', () => {
    expect(clampManualTargetSec(0)).toBe(MAX_MANUAL_DURATION_SEC);
    expect(clampManualTargetSec(Number.NaN)).toBe(MAX_MANUAL_DURATION_SEC);
  });
});
