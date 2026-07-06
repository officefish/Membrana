import { describe, expect, it } from 'vitest';

import {
  padToMinLength,
  prepareWaveform,
  resampleLinear,
  YAMNET_MIN_WAVEFORM_LENGTH,
  YAMNET_SAMPLE_RATE,
} from './resample.js';

describe('resampleLinear', () => {
  it('возвращает исходник при равных частотах', () => {
    const samples = new Float32Array([1, 2, 3]);
    expect(resampleLinear(samples, 16_000, 16_000)).toBe(samples);
  });

  it('48к→16к даёт треть длины', () => {
    const samples = new Float32Array(48_000);
    const out = resampleLinear(samples, 48_000, 16_000);
    expect(out.length).toBe(16_000);
  });

  it('сохраняет форму синуса (частота ниже Найквиста)', () => {
    const sr = 48_000;
    const freq = 1_000;
    const input = new Float32Array(sr / 10);
    for (let i = 0; i < input.length; i++) input[i] = Math.sin((2 * Math.PI * freq * i) / sr);
    const out = resampleLinear(input, sr, YAMNET_SAMPLE_RATE);
    // Проверяем в средней точке: значение близко к аналитическому синусу.
    const mid = Math.floor(out.length / 2);
    const t = mid / YAMNET_SAMPLE_RATE;
    expect(out[mid]).toBeCloseTo(Math.sin(2 * Math.PI * freq * t), 1);
  });

  it('пустой вход → пустой выход', () => {
    expect(resampleLinear(new Float32Array(0), 48_000, 16_000).length).toBe(0);
  });
});

describe('padToMinLength', () => {
  it('дополняет короткую волну нулями до минимума', () => {
    const out = padToMinLength(new Float32Array([0.5]));
    expect(out.length).toBe(YAMNET_MIN_WAVEFORM_LENGTH);
    expect(out[0]).toBe(0.5);
    expect(out[1]).toBe(0);
  });

  it('не трогает достаточно длинную волну', () => {
    const long = new Float32Array(YAMNET_MIN_WAVEFORM_LENGTH + 5);
    expect(padToMinLength(long)).toBe(long);
  });
});

describe('prepareWaveform', () => {
  it('50мс@48к → 16к с паддингом до минимального фрейма', () => {
    const out = prepareWaveform(new Float32Array(2_400), 48_000);
    expect(out.length).toBe(YAMNET_MIN_WAVEFORM_LENGTH);
  });
});
