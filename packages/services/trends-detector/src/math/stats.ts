export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function variance(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  return values.reduce((sum, val) => sum + (val - m) ** 2, 0) / values.length;
}

export function stdDev(values: readonly number[]): number {
  return Math.sqrt(variance(values));
}

/** Fuzzy membership in [min, max] with soft falloff outside the range. */
export function membership(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 1;
  if (value < min) {
    const diff = min - value;
    const maxDiff = min || 1;
    return Math.max(0, 1 - diff / maxDiff);
  }
  const diff = value - max;
  const maxDiff = max * 2 || 1;
  return Math.max(0, 1 - diff / maxDiff);
}
