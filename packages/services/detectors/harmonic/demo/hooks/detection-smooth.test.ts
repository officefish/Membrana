import { describe, expect, it } from 'vitest';

import { DetectionSmoother, DEFAULT_SMOOTHING_CONFIG } from './detection-smooth.js';

describe('DetectionSmoother', () => {
  it('requires consecutive frames to toggle stable isDrone', () => {
    const smoother = new DetectionSmoother();
    const threshold = 0.55;
    const cfg = { ...DEFAULT_SMOOTHING_CONFIG, framesToConfirmOn: 2, framesToConfirmOff: 2 };

    expect(smoother.update({ confidence: 0.7, isDrone: true }, threshold, cfg).stableIsDrone).toBe(
      false,
    );
    expect(smoother.update({ confidence: 0.72, isDrone: true }, threshold, cfg).stableIsDrone).toBe(
      true,
    );

    expect(smoother.update({ confidence: 0.2, isDrone: false }, threshold, cfg).stableIsDrone).toBe(
      true,
    );
    expect(smoother.update({ confidence: 0.18, isDrone: false }, threshold, cfg).stableIsDrone).toBe(
      false,
    );
  });

  it('smooths confidence with EMA', () => {
    const smoother = new DetectionSmoother();
    const first = smoother.update({ confidence: 1, isDrone: true }, 0.55);
    const second = smoother.update({ confidence: 0, isDrone: false }, 0.55);
    expect(second.displayConfidence).toBeGreaterThan(0);
    expect(second.displayConfidence).toBeLessThan(first.displayConfidence);
  });
});
