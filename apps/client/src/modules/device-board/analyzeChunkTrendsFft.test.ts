import { describe, expect, it } from 'vitest';

import { analyzeChunkTrendsFft } from './analyzeChunkTrendsFft';

function makeSilence(sampleRate: number, durationSec: number): Float32Array {
  return new Float32Array(Math.floor(sampleRate * durationSec));
}

describe('analyzeChunkTrendsFft', () => {
  it('returns trends result and raw level for silence chunk', () => {
    const sampleRate = 48_000;
    const samples = makeSilence(sampleRate, 6);
    const analysis = analyzeChunkTrendsFft(samples, sampleRate);

    expect(analysis.result.detectedState).toBeTruthy();
    expect(typeof analysis.result.confidence).toBe('number');
    expect(analysis.rawLevel).toBe(0);
    expect(analysis.result.isDetected).toBe(false);
  });
});
