import { describe, expect, it } from 'vitest';

import {
  estimateNoiseFloor,
  evaluateSoundQuality,
  soundQualityHint,
} from './sound-quality.js';

describe('sound-quality', () => {
  it('estimateNoiseFloor uses lower decile of history', () => {
    const history = Array.from({ length: 100 }, (_, i) => (i < 90 ? 0.01 : 0.2));
    expect(estimateNoiseFloor(history)).toBeCloseTo(0.01, 2);
  });

  it('silence-like input yields low overall', () => {
    const history = Array.from({ length: 80 }, () => 0.008);
    const metrics = evaluateSoundQuality({
      centroidHz: 150,
      flux: 0.05,
      rms: 0.009,
      rmsHistory: history,
    });
    expect(metrics.overall).toBeLessThan(45);
  });

  it('clipping penalizes overall via headroom weight', () => {
    const history = Array.from({ length: 80 }, () => 0.4);
    const clipped = evaluateSoundQuality({
      centroidHz: 900,
      flux: 0.6,
      rms: 0.5,
      rmsHistory: history,
    });
    const ok = evaluateSoundQuality({
      centroidHz: 900,
      flux: 0.6,
      rms: 0.12,
      rmsHistory: history.map((v) => v * 0.3),
    });
    expect(clipped.overall).toBeLessThan(ok.overall);
    expect(soundQualityHint(clipped, { centroidHz: 900, flux: 0.6, rms: 0.5, rmsHistory: history })).toMatch(
      /высокий/i,
    );
  });

  it('speech-like input yields higher overall than silence', () => {
    const history = Array.from({ length: 80 }, (_, i) => 0.04 + (i % 10) * 0.008);
    const metrics = evaluateSoundQuality({
      centroidHz: 800,
      flux: 0.55,
      rms: 0.1,
      rmsHistory: history,
    });
    expect(metrics.overall).toBeGreaterThan(50);
    expect(metrics.snr).toBeGreaterThan(5);
  });
});
