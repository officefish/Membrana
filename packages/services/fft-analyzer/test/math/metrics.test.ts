import { describe, expect, it } from 'vitest';

import {
  SpectralFluxTracker,
  applyFrequencyFilter,
  lowEnergyPercent,
  rms,
  spectralCentroid,
  spectralFlatness,
  spectralRolloff,
  stabilityFromFlux,
  zeroCrossingRate,
} from '../../src/math/metrics.js';

describe('rms', () => {
  it('пустой буфер возвращает 0', () => {
    expect(rms(new Float32Array(0))).toBe(0);
  });

  it('один сэмпл — модуль значения', () => {
    expect(rms(new Float32Array([-0.5]))).toBeCloseTo(0.5, 10);
  });

  it('постоянная амплитуда', () => {
    const buf = new Float32Array(4).fill(0.25);
    expect(rms(buf)).toBeCloseTo(0.25, 10);
  });

  it('синус в квадрате усредняется до 1/sqrt(2) при амплитуде 1', () => {
    const n = 64;
    const buf = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      buf[i] = Math.sin((2 * Math.PI * i) / n);
    }
    expect(rms(buf)).toBeCloseTo(Math.SQRT1_2, 5);
  });
});

describe('spectralCentroid', () => {
  it('нулевые магнитуды — центроид 0', () => {
    const m = new Float32Array(8);
    const f = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(spectralCentroid(m, f)).toBe(0);
  });

  it('один ненулевой бин — частота этого бина', () => {
    const m = new Float32Array(4);
    m[2] = 1;
    const freqs = new Float32Array([100, 200, 300, 400]);
    expect(spectralCentroid(m, freqs)).toBe(300);
  });
});

describe('SpectralFluxTracker', () => {
  it('первый вызов возвращает 0', () => {
    const t = new SpectralFluxTracker();
    expect(t.next(new Float32Array([1, 0, 1]))).toBe(0);
  });

  it('идентичный второй кадр — flux 0', () => {
    const t = new SpectralFluxTracker();
    const a = new Float32Array([0.1, 0.2, 0.3]);
    expect(t.next(a)).toBe(0);
    expect(t.next(new Float32Array(a))).toBe(0);
  });

  it('смена длины массива — снова 0 (как первый вызов после смены)', () => {
    const t = new SpectralFluxTracker();
    expect(t.next(new Float32Array([1, 2]))).toBe(0);
    expect(t.next(new Float32Array([1, 2, 3]))).toBe(0);
  });

  it('reset обнуляет состояние', () => {
    const t = new SpectralFluxTracker();
    t.next(new Float32Array([1, 0]));
    t.next(new Float32Array([0, 1]));
    t.reset();
    expect(t.next(new Float32Array([2, 2]))).toBe(0);
  });
});

describe('lowEnergyPercent', () => {
  it('нулевой спектр — 0', () => {
    expect(lowEnergyPercent(new Float32Array(10))).toBe(0);
  });
});

describe('stabilityFromFlux (порог относительно flux)', () => {
  it('flux = 0 — полная стабильность', () => {
    expect(stabilityFromFlux(0)).toBe(1);
  });

  it('flux = 2 — ниже порога стабильности не уходит в отрицательные', () => {
    expect(stabilityFromFlux(2)).toBe(0);
  });

  it('flux = 1 — линейное снижение', () => {
    expect(stabilityFromFlux(1)).toBeCloseTo(0.5, 10);
  });
});

describe('applyFrequencyFilter', () => {
  it('обнуляет бины вне диапазона, не мутирует вход', () => {
    const m = new Float32Array([1, 2, 3, 4]);
    const f = new Float32Array([50, 150, 250, 350]);
    const out = applyFrequencyFilter(m, f, 100, 300);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(2);
    expect(out[2]).toBe(3);
    expect(out[3]).toBe(0);
    expect(m[0]).toBe(1);
  });
});

describe('zeroCrossingRate', () => {
  it('длина < 2 — 0', () => {
    expect(zeroCrossingRate(new Float32Array(0))).toBe(0);
    expect(zeroCrossingRate(new Float32Array([1]))).toBe(0);
  });

  it('знакочередующийся сигнал', () => {
    const z = new Float32Array([1, -1, 1, -1, 1]);
    expect(zeroCrossingRate(z)).toBeCloseTo(1, 10);
  });
});

describe('spectralRolloff (накопление до процентиля)', () => {
  it('нулевая энергия — 0', () => {
    const m = new Float32Array(4);
    const f = new Float32Array([10, 20, 30, 40]);
    expect(spectralRolloff(m, f)).toBe(0);
  });

  it('один ненулевой бин — rolloff на его частоте при 85%', () => {
    const m = new Float32Array([0, 0, 2, 0]);
    const freqs = new Float32Array([100, 200, 300, 400]);
    expect(spectralRolloff(m, freqs, 0.85)).toBe(300);
  });
});

describe('spectralFlatness', () => {
  it('пустой массив — 0', () => {
    expect(spectralFlatness(new Float32Array(0))).toBe(0);
  });

  it('все нули — 0', () => {
    expect(spectralFlatness(new Float32Array(5))).toBe(0);
  });

  it('равномерные положительные магнитуды — 1 (белый шум в смысле flatness)', () => {
    const m = new Float32Array(8).fill(2.5);
    expect(spectralFlatness(m)).toBeCloseTo(1, 10);
  });
});
