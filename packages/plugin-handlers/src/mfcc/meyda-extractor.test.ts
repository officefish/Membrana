import { describe, expect, it } from 'vitest';
import { createMeydaExtractor } from './meyda-extractor.js';
import { mfccConfigFromHash } from './preset.js';

describe('createMeydaExtractor — дым на настоящем сигнале', () => {
  it('на кадре синуса под пресет отдаёт ровно numberOfCoefficients конечных чисел; два вызова — одинаковы', async () => {
    const config = mfccConfigFromHash('mel40-c24-buf4096-sr48000')!;
    const extract = await createMeydaExtractor(config);
    const frame = Float32Array.from({ length: config.bufferSize }, (_, i) => Math.sin((2 * Math.PI * 440 * i) / config.sampleRate) * 0.3);
    const a = extract(frame, config);
    expect(a).toHaveLength(24);
    expect(a.every((v) => Number.isFinite(v))).toBe(true);
    expect(extract(frame, config)).toEqual(a);
  });
});
