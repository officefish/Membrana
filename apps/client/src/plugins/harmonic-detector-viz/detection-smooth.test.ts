import { describe, expect, it } from 'vitest';

import { DetectionSmoother } from './detection-smooth';

describe('DetectionSmoother', () => {
  it('requires consecutive frames to turn on stable drone', () => {
    const smoother = new DetectionSmoother();
    const threshold = 0.55;

    for (let i = 0; i < 2; i++) {
      const s = smoother.update({ confidence: 0.7, isDrone: true }, threshold);
      expect(s.stableIsDrone).toBe(false);
    }
    const on = smoother.update({ confidence: 0.7, isDrone: true }, threshold);
    expect(on.stableIsDrone).toBe(true);
  });
});
