import { describe, expect, it } from 'vitest';

import type { MfccVector } from '../types.js';
import { evaluateTrend, type TrendSpec } from './trend.js';

const HASH = 'mel40-c4-buf512';

const vec = (coefficients: readonly number[], windowStartIndex: number, hash = HASH): MfccVector => ({
  coefficients: Float32Array.from(coefficients),
  windowStartIndex,
  configHash: hash,
});

/** Корпус из повторяющихся форм: первые `half` — база, вторые — «сейчас». */
const run = (base: readonly number[], now: readonly number[], half = 3): MfccVector[] => {
  const out: MfccVector[] = [];
  for (let i = 0; i < half; i++) out.push(vec(base, i * 512));
  for (let i = 0; i < half; i++) out.push(vec(now, (half + i) * 512));
  return out;
};

const SPEC: TrendSpec = {
  windowSize: 6,
  shapeDeltaThreshold: 0.05,
  scaleRatioThreshold: 0.15,
  minMagnitude: 1e-3,
};

describe('тренд считается по ДВУМ осям: форма и масштаб', () => {
  it('контур не менялся — steady, обе оси около нуля', () => {
    const out = evaluateTrend(run([1, 2, 3, 4], [1, 2, 3, 4]), SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.trend).toBe('steady');
    expect(out.report.shapeDelta).toBeCloseTo(0, 6);
    expect(out.report.scaleRatio).toBeCloseTo(0, 6);
  });

  it('та же форма, но вдвое громче — amplifying (косинус в одиночку сказал бы steady)', () => {
    // Ровно та ложь, которую профильный контекст назвал за своим же предложением:
    // косинус нормирован и усиления не видит. Вторая ось её закрывает.
    const out = evaluateTrend(run([1, 2, 3, 4], [2, 4, 6, 8]), SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.shapeDelta).toBeCloseTo(0, 6);
    expect(out.report.scaleRatio).toBeCloseTo(1, 6);
    expect(out.report.trend).toBe('amplifying');
  });

  it('та же форма, но вдвое тише — attenuating', () => {
    const out = evaluateTrend(run([2, 4, 6, 8], [1, 2, 3, 4]), SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.trend).toBe('attenuating');
    expect(out.report.scaleRatio).toBeCloseTo(-0.5, 6);
  });

  it('форма ушла — drifting, и форма перекрывает масштаб', () => {
    const out = evaluateTrend(run([4, 3, 2, 1], [1, 2, 3, 8]), SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.shapeDelta).toBeGreaterThan(SPEC.shapeDeltaThreshold);
    expect(out.report.trend).toBe('drifting');
  });

  it('вердикт адресован во времени — краями судимого окна', () => {
    const out = evaluateTrend(run([1, 2, 3, 4], [1, 2, 3, 4]), SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.fromWindowStartIndex).toBe(0);
    expect(out.report.toWindowStartIndex).toBe(5 * 512);
  });

  it('судится ПОСЛЕДНЕЕ полное окно, а не весь корпус', () => {
    const corpus = [...run([9, 9, 9, 9], [9, 9, 9, 9]), ...run([1, 2, 3, 4], [2, 4, 6, 8])].map(
      (v, i) => vec(Array.from(v.coefficients), i * 512),
    );
    const out = evaluateTrend(corpus, SPEC);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.report.fromWindowStartIndex).toBe(6 * 512);
    expect(out.report.trend).toBe('amplifying');
  });
});

describe('ложный зелёный тренда закрыт отказом, а не флагом ready', () => {
  it('корпус короче окна — ОТКАЗ, а не steady (аналог на FFT вернул бы stable)', () => {
    const out = evaluateTrend(run([1, 2, 3, 4], [1, 2, 3, 4], 2), SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('< требуемых 6');
  });

  it('тишина в обеих половинах — отказ «окно вырождено», а не steady', () => {
    const out = evaluateTrend(run([0, 0, 0, 0], [0, 0, 0, 0]), SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('вырождено');
  });

  it('вырожденная база при живом «сейчас» — отказ, а не деление на ноль', () => {
    const out = evaluateTrend(run([0, 0, 0, 0], [1, 2, 3, 4]), SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('вырождено');
  });

  it('пустой корпус — отказ с причиной', () => {
    const out = evaluateTrend([], SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('пуст');
  });

  it('смешанные отпечатки — отказ до всякой арифметики', () => {
    const corpus = run([1, 2, 3, 4], [2, 4, 6, 8]);
    const mixed = [...corpus.slice(0, 5), vec([2, 4, 6, 8], 5 * 512, 'mel26-c4-buf512')];
    const out = evaluateTrend(mixed, SPEC);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain('несравним');
  });
});

describe('негодная настройка тренда называется поимённо', () => {
  it.each([
    ['windowSize', { ...SPEC, windowSize: 5 }],
    ['shapeDeltaThreshold', { ...SPEC, shapeDeltaThreshold: 0 }],
    ['scaleRatioThreshold', { ...SPEC, scaleRatioThreshold: -1 }],
    ['minMagnitude', { ...SPEC, minMagnitude: 0 }],
  ])('%s вне области — отказ, окно НЕ округляется молча', (field, spec) => {
    const out = evaluateTrend(run([1, 2, 3, 4], [2, 4, 6, 8]), spec as TrendSpec);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toContain(field);
  });
});

describe('детерминизм — свойство контракта, а не дисциплины', () => {
  it('один и тот же корпус даёт побитово тот же отчёт', () => {
    const corpus = run([1, 2, 3, 4], [2, 4, 6, 8]);
    const a = evaluateTrend(corpus, SPEC);
    const b = evaluateTrend(corpus, SPEC);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
