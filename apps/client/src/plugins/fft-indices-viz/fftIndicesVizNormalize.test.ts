import { describe, expect, it } from 'vitest';

import {
  ActivityEnvelope,
  preprocessFftIndicesSample,
} from './fftIndicesVizNormalize';

describe('fftIndicesVizNormalize', () => {
  it('preprocess caps flux like demo', () => {
    expect(preprocessFftIndicesSample(1000, 2, 0.01).flux).toBe(1);
  });

  it('ActivityEnvelope tracks rising signal into upper range', () => {
    const env = new ActivityEnvelope(50);
    const samples = [400, 520, 680, 820, 950];
    let prev = -1;
    for (const hz of samples) {
      const n = env.normalize(hz);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(prev).toBeGreaterThan(0.5);
  });

  it('ActivityEnvelope resets to center', () => {
    const env = new ActivityEnvelope(0.05);
    env.normalize(1);
    env.reset();
    expect(env.normalize(0.2)).toBe(0.5);
  });
});
