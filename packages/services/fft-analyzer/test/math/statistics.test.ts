import { describe, expect, it } from 'vitest';

import {
  maxOf,
  mean,
  minOf,
  std,
  summarize,
} from '../../src/math/statistics.js';

describe('mean', () => {
  it('пустой массив — 0', () => {
    expect(mean([])).toBe(0);
  });

  it('фиксированные значения', () => {
    expect(mean([2, 4, 6])).toBe(4);
  });
});

describe('std', () => {
  it('пустой массив — 0', () => {
    expect(std([])).toBe(0);
  });

  it('константы — 0', () => {
    expect(std([5, 5, 5])).toBe(0);
  });

  it('использует precomputedMean при передаче', () => {
    const values = [1, 2, 3];
    const m = 2;
    expect(std(values, m)).toBeCloseTo(Math.sqrt(2 / 3), 10);
  });
});

describe('minOf / maxOf', () => {
  it('пустой массив — 0 для обоих', () => {
    expect(minOf([])).toBe(0);
    expect(maxOf([])).toBe(0);
  });

  it('один элемент', () => {
    expect(minOf([-3])).toBe(-3);
    expect(maxOf([-3])).toBe(-3);
  });

  it('несколько элементов', () => {
    expect(minOf([1, -2, 3])).toBe(-2);
    expect(maxOf([1, -2, 3])).toBe(3);
  });
});

describe('summarize', () => {
  it('пустой массив — нули по полям MetricStats', () => {
    expect(summarize([])).toEqual({
      min: 0,
      max: 0,
      mean: 0,
      std: 0,
    });
  });

  it('агрегация [1,2,3,4]', () => {
    const s = summarize([1, 2, 3, 4]);
    expect(s.min).toBe(1);
    expect(s.max).toBe(4);
    expect(s.mean).toBe(2.5);
    expect(s.std).toBeCloseTo(Math.sqrt(1.25), 10);
  });
});
