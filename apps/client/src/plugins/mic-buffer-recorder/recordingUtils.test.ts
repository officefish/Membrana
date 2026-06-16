import { describe, expect, it } from 'vitest';

import { clampManualTargetSec, formatStoredSampleCount, pluralizeSampleWord } from './recordingUtils';
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

  it('pluralizes sample count in Russian', () => {
    expect(pluralizeSampleWord(1)).toBe('семпл');
    expect(pluralizeSampleWord(2)).toBe('семпла');
    expect(pluralizeSampleWord(4)).toBe('семпла');
    expect(pluralizeSampleWord(5)).toBe('семплов');
    expect(pluralizeSampleWord(11)).toBe('семплов');
    expect(pluralizeSampleWord(21)).toBe('семпл');
    expect(formatStoredSampleCount(4)).toBe('В памяти хранится: 4 семпла');
  });
});
