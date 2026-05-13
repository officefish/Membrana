/**
 * Чистый radix-2 Cooley—Tukey FFT.
 *
 * НЕТ зависимостей от React / DOM / Web Audio.
 * Используется и в live-режиме (своя реализация для анализа AnalyserNode-фрейма),
 * и в file-режиме (для анализа произвольного AudioBuffer).
 *
 * Сложность: O(N log N). In-place, типизированные массивы, прекомпьют twiddles.
 */

import { ValidationError } from '@membrana/core';

export class FftCore {
  private readonly size: number;
  private readonly cos: Float64Array;
  private readonly sin: Float64Array;
  private readonly window: Float32Array;

  constructor(size: number) {
    if (!Number.isInteger(Math.log2(size))) {
      throw new ValidationError('FFT size must be a power of two', 'size');
    }
    this.size = size;

    const halfN = size / 2;
    this.cos = new Float64Array(halfN);
    this.sin = new Float64Array(halfN);
    for (let i = 0; i < halfN; i++) {
      const phase = (-2 * Math.PI * i) / size;
      this.cos[i] = Math.cos(phase);
      this.sin[i] = Math.sin(phase);
    }

    // Окно Хэмминга — снижает спектральную утечку.
    this.window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      this.window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
    }
  }

  /** Размер FFT. */
  getSize(): number {
    return this.size;
  }

  /**
   * Применяет окно Хэмминга к буферу сэмплов и считает амплитуды бинов.
   * Возвращает массив длины size/2 с нормализованными магнитудами.
   */
  computeMagnitudes(samples: Float32Array): Float32Array {
    const n = this.size;
    if (samples.length < n) {
      throw new ValidationError(
        `Need at least ${n} samples, got ${samples.length}`,
        'samples',
      );
    }

    const re = new Float64Array(n);
    const im = new Float64Array(n);

    for (let i = 0; i < n; i++) {
      re[i] = samples[i]! * this.window[i]!;
    }

    this.fftInPlace(re, im);

    const halfN = n / 2;
    const magnitudes = new Float32Array(halfN);
    for (let i = 0; i < halfN; i++) {
      magnitudes[i] =
        Math.sqrt(re[i]! * re[i]! + im[i]! * im[i]!) / halfN;
    }
    return magnitudes;
  }

  /** Возвращает массив центров частот для бинов при заданной sampleRate. */
  computeFrequencies(sampleRate: number): Float32Array {
    const halfN = this.size / 2;
    const nyquist = sampleRate / 2;
    const out = new Float32Array(halfN);
    for (let i = 0; i < halfN; i++) {
      out[i] = (i / halfN) * nyquist;
    }
    return out;
  }

  /** In-place Cooley—Tukey radix-2 FFT. */
  private fftInPlace(re: Float64Array, im: Float64Array): void {
    const n = re.length;

    // Bit-reversal permutation.
    let j = 0;
    for (let i = 1; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) {
        j ^= bit;
      }
      j ^= bit;
      if (i < j) {
        [re[i], re[j]] = [re[j]!, re[i]!];
        [im[i], im[j]] = [im[j]!, im[i]!];
      }
    }

    // Butterflies.
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let k = 0; k < half; k++) {
          const ti = k * step;
          const c = this.cos[ti]!;
          const s = this.sin[ti]!;
          const tRe = c * re[i + k + half]! - s * im[i + k + half]!;
          const tIm = c * im[i + k + half]! + s * re[i + k + half]!;
          re[i + k + half] = re[i + k]! - tRe;
          im[i + k + half] = im[i + k]! - tIm;
          re[i + k] = re[i + k]! + tRe;
          im[i + k] = im[i + k]! + tIm;
        }
      }
    }
  }
}
