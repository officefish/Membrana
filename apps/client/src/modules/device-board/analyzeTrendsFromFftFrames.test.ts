import { describe, expect, it } from 'vitest';

import { analyzeTrendsFromFftFrames } from './analyzeTrendsFromFftFrames';

describe('analyzeTrendsFromFftFrames', () => {
  it('returns null for empty frames', () => {
    expect(analyzeTrendsFromFftFrames([])).toBeNull();
  });

  it('classifies quiet frames', () => {
    const frames = Array.from({ length: 8 }, (_, index) => ({
      computedAtIso: new Date(Date.now() + index * 120).toISOString(),
      spectralCentroidHz: 200,
      flux: 0.001,
      rms: 0.001,
    }));
    const result = analyzeTrendsFromFftFrames(frames);
    expect(result).not.toBeNull();
    expect(result!.metricSampleCount).toBe(8);
  });
});
