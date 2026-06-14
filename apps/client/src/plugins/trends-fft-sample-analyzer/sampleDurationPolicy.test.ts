import { describe, expect, it } from 'vitest';

import { resolveSampleDurationPlan } from './sampleDurationPolicy';

describe('resolveSampleDurationPlan', () => {
  it('blocks samples shorter than 1 second', () => {
    const result = resolveSampleDurationPlan(0.5, 100, 100);
    expect(result.kind).toBe('blocked');
  });

  it('clamps window when file is shorter than configured analysis', () => {
    const result = resolveSampleDurationPlan(3, 100, 100);
    expect(result.kind).toBe('allowed');
    if (result.kind === 'allowed') {
      expect(result.plan.effectiveMeasurementsCount).toBe(30);
      expect(result.plan.status).toBe('window_clamped');
    }
  });

  it('truncates files longer than 10 seconds', () => {
    const result = resolveSampleDurationPlan(25, 50, 100);
    expect(result.kind).toBe('allowed');
    if (result.kind === 'allowed') {
      expect(result.plan.analysisSegmentSec).toBe(10);
      expect(result.plan.status).toBe('too_long_truncated');
    }
  });
});
