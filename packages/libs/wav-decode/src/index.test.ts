import { describe, expect, it } from 'vitest';
import { decodeWavMono16 } from './index';

/** Синтетический WAV: каналы, разрядность и отсчёты задаются, чтобы зуб держал формат, а не файл. */
function wav({ rate = 48000, channels = 1, bits = 16, frames }: { rate?: number; channels?: number; bits?: number; frames: number[][] }): Uint8Array {
  const n = frames.length;
  const bytesPerSample = bits / 8;
  const buf = new ArrayBuffer(44 + n * channels * bytesPerSample);
  const v = new DataView(buf);
  const tag = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  tag(0, 'RIFF'); v.setUint32(4, 36 + n * channels * bytesPerSample, true); tag(8, 'WAVE'); tag(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * channels * bytesPerSample, true);
  v.setUint16(32, channels * bytesPerSample, true); v.setUint16(34, bits, true);
  tag(36, 'data'); v.setUint32(40, n * channels * bytesPerSample, true);
  if (bits === 16) frames.forEach((f, i) => f.forEach((s, ch) => v.setInt16(44 + (i * channels + ch) * 2, s, true)));
  return new Uint8Array(buf);
}

describe('decodeWavMono16', () => {
  it('моно: отсчёты нормируются к [-1, 1), частота читается из fmt', () => {
    const r = decodeWavMono16(wav({ rate: 44100, frames: [[16384], [-32768], [0]] }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.audio.sampleRate).toBe(44100);
    expect([...r.audio.samples]).toEqual([0.5, -1, 0]);
  });

  it('стерео усредняется в моно', () => {
    const r = decodeWavMono16(wav({ channels: 2, frames: [[16384, -16384], [16384, 16384]] }));
    expect(r.ok && [...r.audio.samples]).toEqual([0, 0.5]);
  });

  it('отказы с причиной: не RIFF, чужая разрядность, нет data', () => {
    expect(decodeWavMono16(new Uint8Array(3))).toEqual({ ok: false, reason: 'не RIFF/WAVE' });
    expect(decodeWavMono16(wav({ bits: 24, frames: [[0]] }))).toEqual({ ok: false, reason: 'разрядность 24 — декодер только PCM16' });
    const noData = wav({ frames: [[1]] });
    noData.set([0x6a, 0x75, 0x6e, 0x6b], 36); // 'junk' вместо 'data'
    expect(decodeWavMono16(noData)).toEqual({ ok: false, reason: 'нет чанка data' });
  });

  it('Buffer принимается как Uint8Array (потребители media и scripts подают Buffer)', () => {
    const r = decodeWavMono16(Buffer.from(wav({ frames: [[8192]] })));
    expect(r.ok && r.audio.samples[0]).toBeCloseTo(0.25);
  });
});

describe('копий декодера у трёх потребителей не осталось (#1972)', () => {
  it('wav-read.mjs, decode-wav-mono.ts и plugin-handlers/wav.ts не разбирают RIFF сами', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const root = resolve(__dirname, '../../../..');
    for (const rel of ['scripts/lib/wav-read.mjs', 'packages/background-media/src/audio/decode-wav-mono.ts', 'packages/plugin-handlers/src/wav.ts']) {
      const src = readFileSync(resolve(root, rel), 'utf8');
      expect(src, rel).not.toMatch(/'RIFF'|"RIFF"|getInt16\(|readInt16LE\(/u);
      expect(src, rel).toMatch(/wav-decode/u);
    }
  });
});
