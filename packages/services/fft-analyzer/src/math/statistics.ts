/**
 * Чистая статистика — mean, std, min/max и обобщающая агрегация для метрик.
 */

import type { MetricStats } from '../types.js';

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i]!;
  return sum / values.length;
}

export function std(values: readonly number[], precomputedMean?: number): number {
  if (values.length === 0) return 0;
  const m = precomputedMean ?? mean(values);
  let acc = 0;
  for (let i = 0; i < values.length; i++) {
    const d = values[i]! - m;
    acc += d * d;
  }
  return Math.sqrt(acc / values.length);
}

export function minOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let m = values[0]!;
  for (let i = 1; i < values.length; i++) {
    if (values[i]! < m) m = values[i]!;
  }
  return m;
}

export function maxOf(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let m = values[0]!;
  for (let i = 1; i < values.length; i++) {
    if (values[i]! > m) m = values[i]!;
  }
  return m;
}

/** Агрегирует массив значений в MetricStats. */
export function summarize(values: readonly number[]): MetricStats {
  const m = mean(values);
  return {
    min: minOf(values),
    max: maxOf(values),
    mean: m,
    std: std(values, m),
  };
}
