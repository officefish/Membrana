export const MEASUREMENTS_MIN = 5;
export const MEASUREMENTS_MAX = 300;
export const INTERVAL_MS_MIN = 50;
export const INTERVAL_MS_MAX = 1000;

/** Быстрый выбор числа замеров в окне анализа. */
export const MEASUREMENT_COUNT_PRESETS = [5, 20, 50, 100, 150, 300] as const;

/** Быстрый выбор интервала между замерами (мс). */
export const INTERVAL_MS_PRESETS = [50, 100, 200, 500, 1000] as const;

export function analysisDurationSec(
  measurementsCount: number,
  intervalMs: number,
): number {
  return (measurementsCount * intervalMs) / 1000;
}
