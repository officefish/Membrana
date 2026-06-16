import { describe, expect, it } from 'vitest';

import { analyzeDroneDetectionDetailed } from './analyze-drone-detection.js';

/** Synthesize a mono harmonic stack (drone-like) without any Web Audio API. */
function synthHarmonic(sampleRate: number, durationSec: number, f0: number): Float32Array {
  const n = Math.floor(sampleRate * durationSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const t = i / sampleRate;
    out[i] =
      0.5 * Math.sin(2 * Math.PI * f0 * t) +
      0.3 * Math.sin(2 * Math.PI * 2 * f0 * t) +
      0.2 * Math.sin(2 * Math.PI * 3 * f0 * t);
  }
  return out;
}

describe('analyzeDroneDetectionDetailed', () => {
  it('builds a full DDR with four detector sections in Node (no Web Audio)', async () => {
    const sampleRate = 22_050;
    const samples = synthHarmonic(sampleRate, 1, 180);

    const { verdicts, report } = await analyzeDroneDetectionDetailed(samples, sampleRate, {
      sampleId: 'test-sample',
      sampleTitle: 'synthetic-harmonic',
    });

    expect(verdicts).toHaveLength(4);
    expect(report.verdicts).toHaveLength(4);
    expect(report.meta.sampleId).toBe('test-sample');
    expect(typeof report.meta.reportId).toBe('string');
    expect(report.meta.reportId.length).toBeGreaterThan(0);
    expect(report.meta.sampleDurationSec).toBeCloseTo(1, 1);
  });
});
