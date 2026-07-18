import { describe, expect, it } from 'vitest';

import { LOW_BAND_MAX_HZ, lowEnergyPercent } from './metrics.js';

/** Прежняя реализация: доля БИНОВ, «нижняя 1/10». Эталон для проверки на 48 kHz. */
function legacyLowEnergyPercent(magnitudes: Float32Array): number {
  const lowBands = Math.max(1, Math.floor(magnitudes.length * 0.1));
  let low = 0;
  let total = 0;
  for (let i = 0; i < magnitudes.length; i++) {
    const m = magnitudes[i]!;
    total += m;
    if (i < lowBands) low += m;
  }
  return total > 0 ? (low / total) * 100 : 0;
}

/** Спектр с энергией, размазанной по всем бинам детерминированно. */
function ramp(length: number): Float32Array {
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = 1 + (i % 7) * 0.3;
  return out;
}

describe('lowEnergyPercent — полоса в герцах, а не в долях спектра', () => {
  it('на 48 kHz совпадает с прежней «нижней 1/10» бит в бит (любой fftSize)', () => {
    for (const halfSize of [128, 256, 512, 1024, 2048]) {
      const mags = ramp(halfSize);
      expect(lowEnergyPercent(mags, 48_000)).toBe(legacyLowEnergyPercent(mags));
    }
  });

  it('умолчание сигнатуры — калибровочные 48 kHz (совместимость старых вызовов)', () => {
    const mags = ramp(1024);
    expect(lowEnergyPercent(mags)).toBe(lowEnergyPercent(mags, 48_000));
  });

  it('на 16 kHz полоса та же в ГЕРЦАХ, а не та же в бинах', () => {
    const halfSize = 1024;
    const mags = ramp(halfSize);

    // Прежнее поведение на 16 kHz мерило бы 0–800 Гц (те же 102 бина) —
    // подмена признака. Теперь берётся втрое больше бинов: 0–2400 Гц.
    const binsAt48 = Math.floor((halfSize * 2 * LOW_BAND_MAX_HZ) / 48_000);
    const binsAt16 = Math.floor((halfSize * 2 * LOW_BAND_MAX_HZ) / 16_000);
    expect(binsAt48).toBe(102);
    expect(binsAt16).toBe(307);

    // Значение на 16 kHz обязано отличаться от «нижней 1/10» — иначе правка
    // не сработала бы вовсе.
    expect(lowEnergyPercent(mags, 16_000)).not.toBe(legacyLowEnergyPercent(mags));
  });

  it('одинаковый физический сигнал даёт близкий процент на 48 и 16 kHz', () => {
    // Энергия только ниже 2400 Гц: на обеих частотах вся она внутри полосы.
    const make = (halfSize: number, sampleRate: number) => {
      const out = new Float32Array(halfSize);
      const nyquist = sampleRate / 2;
      for (let i = 0; i < halfSize; i++) {
        const hz = (i / halfSize) * nyquist;
        out[i] = hz < 2000 ? 1 : 0;
      }
      return out;
    };
    const at48 = lowEnergyPercent(make(1024, 48_000), 48_000);
    const at16 = lowEnergyPercent(make(1024, 16_000), 16_000);
    expect(at48).toBeCloseTo(100, 0);
    expect(at16).toBeCloseTo(100, 0);
  });

  it('полоса не схлопывается в ноль на экзотических частотах', () => {
    const mags = ramp(64);
    expect(lowEnergyPercent(mags, 192_000)).toBeGreaterThan(0);
    expect(Number.isFinite(lowEnergyPercent(mags, 8_000))).toBe(true);
  });

  it('пустой спектр не делит на ноль', () => {
    expect(lowEnergyPercent(new Float32Array(16), 16_000)).toBe(0);
  });
});
