import { describe, expect, it } from 'vitest';

import { concatAudioSamplePayloads } from './concat-audio-samples';

describe('concatAudioSamplePayloads', () => {
  it('returns null for empty input', () => {
    expect(concatAudioSamplePayloads([])).toBeNull();
  });

  it('crossfades boundary discontinuity', () => {
    const first = new Float32Array([1, 1, 1, 1]);
    const second = new Float32Array([-1, -1, -1, -1]);
    const result = concatAudioSamplePayloads(
      [
        { sampleRate: 48_000, samples: first },
        { sampleRate: 48_000, samples: second },
      ],
      2,
    );
    expect(result).not.toBeNull();
    expect(result!.samples.length).toBe(6);
    expect(Math.abs(result!.samples[3]!)).toBeLessThan(1);
  });
});
