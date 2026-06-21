import { describe, expect, it } from 'vitest';

import { ScenarioContinuousPcmBuffer } from './scenario-continuous-pcm-buffer';

describe('ScenarioContinuousPcmBuffer', () => {
  it('takeSlice returns merged PCM and clears buffer', () => {
    const buffer = new ScenarioContinuousPcmBuffer();
    buffer.append(new Float32Array([1, 2]), 48_000);
    buffer.append(new Float32Array([3, 4]), 48_000);
    const slice = buffer.takeSlice();
    expect(slice?.samples).toEqual(new Float32Array([1, 2, 3, 4]));
    expect(slice?.sampleRate).toBe(48_000);
    expect(buffer.takeSlice()).toBeNull();
  });
});
