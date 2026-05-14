import { describe, expect, it } from 'vitest';

import { ValidationError } from '@membrana/core';

import { FftCore } from '../../src/math/fft.js';

describe('FftCore', () => {
  it('бросает ValidationError, если размер не степень двойки', () => {
    expect(() => new FftCore(100)).toThrow(ValidationError);
    expect(() => new FftCore(100)).toThrow('power of two');
    try {
      new FftCore(3);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe('size');
    }
  });

  it('принимает валидные степени двойки и отдаёт getSize()', () => {
    const fft = new FftCore(256);
    expect(fft.getSize()).toBe(256);
  });

  it('computeMagnitudes: нулевой сигнал даёт нулевые магнитуды', () => {
    const n = 256;
    const fft = new FftCore(n);
    const samples = new Float32Array(n);
    const mags = fft.computeMagnitudes(samples);
    expect(mags.length).toBe(n / 2);
    for (let i = 0; i < mags.length; i++) {
      expect(mags[i]).toBe(0);
    }
  });

  it('computeMagnitudes: постоянный сигнал — максимум энергии в DC-бине (0)', () => {
    const n = 256;
    const fft = new FftCore(n);
    const samples = new Float32Array(n).fill(1);
    const mags = fft.computeMagnitudes(samples);
    let argmax = 0;
    let maxv = mags[0]!;
    for (let i = 1; i < mags.length; i++) {
      if (mags[i]! > maxv) {
        maxv = mags[i]!;
        argmax = i;
      }
    }
    expect(argmax).toBe(0);
    expect(maxv).toBeGreaterThan(0);
  });

  it('computeMagnitudes: детерминированная синусоида (8 периодов) — пик на ожидаемом бине', () => {
    const n = 256;
    const fft = new FftCore(n);
    const samples = new Float32Array(n);
    const cycles = 8;
    for (let i = 0; i < n; i++) {
      samples[i] = Math.sin((2 * Math.PI * cycles * i) / n);
    }
    const mags = fft.computeMagnitudes(samples);
    let argmax = 0;
    let maxv = mags[0]!;
    for (let i = 1; i < mags.length; i++) {
      if (mags[i]! > maxv) {
        maxv = mags[i]!;
        argmax = i;
      }
    }
    expect(argmax).toBe(cycles);
    expect(maxv).toBeCloseTo(0.5381962060928345, 6);
  });

  it('computeMagnitudes: слишком короткий буфер — ValidationError', () => {
    const fft = new FftCore(256);
    const short = new Float32Array(10);
    expect(() => fft.computeMagnitudes(short)).toThrow(ValidationError);
    expect(() => fft.computeMagnitudes(short)).toThrow('at least 256');
    try {
      fft.computeMagnitudes(short);
      expect.fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).field).toBe('samples');
    }
  });

  it('computeFrequencies: линейная сетка от 0 до Nyquist (не включая Nyquist в последнем бине)', () => {
    const fft = new FftCore(256);
    const sr = 48_000;
    const f = fft.computeFrequencies(sr);
    expect(f.length).toBe(128);
    expect(f[0]).toBe(0);
    expect(f[1]).toBeCloseTo(187.5, 10);
    expect(f[f.length - 1]).toBeCloseTo(23_812.5, 10);
    for (let i = 1; i < f.length; i++) {
      expect(f[i]).toBeGreaterThan(f[i - 1]!);
    }
  });
});
