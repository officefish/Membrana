import { describe, expect, it } from 'vitest';

import { decodeWavMono } from './decode-wav-mono';

/** Build a minimal 16-bit PCM WAV buffer from mono int16 samples. */
function buildWav(samples: Int16Array, sampleRate: number, channels = 1): Buffer {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * bytesPerSample, 28);
  buf.writeUInt16LE(channels * bytesPerSample, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    buf.writeInt16LE(samples[i]!, 44 + i * 2);
  }
  return buf;
}

describe('decodeWavMono', () => {
  it('decodes 16-bit PCM mono WAV into normalized Float32 samples', () => {
    const wav = buildWav(Int16Array.from([0, 16_384, -16_384, 32_767]), 16_000);
    const { samples, sampleRate } = decodeWavMono(wav);

    expect(sampleRate).toBe(16_000);
    expect(samples).toHaveLength(4);
    expect(samples[0]).toBeCloseTo(0, 5);
    expect(samples[1]).toBeCloseTo(0.5, 3);
    expect(samples[2]).toBeCloseTo(-0.5, 3);
    expect(samples[3]).toBeCloseTo(1, 2);
  });

  it('averages stereo channels into mono', () => {
    // Two interleaved frames: L/R = (32767,-32768) then (0,0).
    const wav = buildWav(Int16Array.from([32_767, -32_768, 0, 0]), 8_000, 2);
    const { samples, sampleRate } = decodeWavMono(wav);

    expect(sampleRate).toBe(8_000);
    expect(samples).toHaveLength(2);
    expect(samples[0]!).toBeCloseTo((32_767 / 32_768 + -1) / 2, 4);
    expect(samples[1]).toBeCloseTo(0, 5);
  });

  it('rejects non-WAV buffers', () => {
    expect(() => decodeWavMono(Buffer.from('not a wav file at all!!'))).toThrow();
  });
});
