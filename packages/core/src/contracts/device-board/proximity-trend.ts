/**
 * basn-4 (#323, консилиум 2026-07-09 т.2): ЧИСТЫЙ классификатор тренда
 * «дистанции» для alarm-loop. Апстрим одной леммой: направление громкости
 * (approaching/receding/stable) + потеря цели (lost) по серии combinedScore.
 *
 * Состояние (накопление серий per runId/nodeId) живёт на ХОСТЕ — здесь только
 * тотальная функция без store/DOM/Web Audio. Громкость — ГРУБАЯ мера сцены,
 * не координата и не расстояние; реальный гейт тревоги — combinedScore fusion.
 */

export type ProximityTrend = 'approaching' | 'receding' | 'stable' | 'lost';

export interface ProximityTrendInput {
  /** Окно громкостей (старые → новые); host накапливает per (runId, nodeId). */
  readonly loudnessSeries: readonly number[];
  /** Последние combinedScore fusion (старые → новые) — для детекции 'lost'. */
  readonly scoreSeries: readonly number[];
}

export interface ProximityTrendOptions {
  /** Длина окна громкости (чётное ≥ 2; половины: база/текущее). Default 12. */
  readonly windowSize?: number;
  /** Относительный рост текущего над базой для 'approaching'. Default 0.15. */
  readonly approachRatio?: number;
  /** Относительное падение для 'receding'. Default 0.15. */
  readonly recedeRatio?: number;
  /** Ниже этой громкости сцена — тишина → 'stable' (без деления на шум). Default 1e-4. */
  readonly minLoudness?: number;
  /** Порог combinedScore, ниже которого итерация — «промах». Default 0.3. */
  readonly lostScoreThreshold?: number;
  /** Столько промахов ПОДРЯД (хвост серии) → 'lost'. Default 3. */
  readonly lostAfterMisses?: number;
}

export interface ProximityTrendResult {
  readonly trend: ProximityTrend;
  /** Накоплено ли полное окно громкости (иначе тренд не судим — 'stable'). */
  readonly ready: boolean;
  /** Относительное изменение (current − baseline) / baseline; 0 до готовности. */
  readonly deltaRatio: number;
}

const DEFAULTS = {
  windowSize: 12,
  approachRatio: 0.15,
  recedeRatio: 0.15,
  minLoudness: 1e-4,
  lostScoreThreshold: 0.3,
  lostAfterMisses: 3,
} as const;

function normalizeEvenWindow(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULTS.windowSize;
  const n = Math.max(2, Math.trunc(value));
  return n % 2 === 0 ? n : n + 1;
}

function positiveOr(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function average(values: readonly number[], from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i += 1) {
    sum += values[i]!;
  }
  return (to - from) > 0 ? sum / (to - from) : 0;
}

/**
 * Классифицирует тренд «дистанции» по сериям громкости и combinedScore.
 *
 * Приоритет: 'lost' (N промахов score подряд) → направление громкости.
 * Тотальная: битые входы → 'stable', not ready.
 */
export function classifyProximityTrend(
  input: ProximityTrendInput,
  options: ProximityTrendOptions = {},
): ProximityTrendResult {
  const windowSize = normalizeEvenWindow(options.windowSize);
  const approachRatio = positiveOr(options.approachRatio, DEFAULTS.approachRatio);
  const recedeRatio = positiveOr(options.recedeRatio, DEFAULTS.recedeRatio);
  const minLoudness = positiveOr(options.minLoudness, DEFAULTS.minLoudness);
  const lostScoreThreshold = positiveOr(options.lostScoreThreshold, DEFAULTS.lostScoreThreshold);
  const lostAfterMisses = Math.max(1, Math.trunc(positiveOr(options.lostAfterMisses, DEFAULTS.lostAfterMisses)));

  // 'lost': хвост серии score — N промахов подряд (и серия успела набраться).
  const scores = input.scoreSeries.filter((s) => Number.isFinite(s));
  if (scores.length >= lostAfterMisses) {
    const tail = scores.slice(-lostAfterMisses);
    if (tail.every((s) => s < lostScoreThreshold)) {
      return { trend: 'lost', ready: true, deltaRatio: 0 };
    }
  }

  const series = input.loudnessSeries.filter((v) => Number.isFinite(v) && v >= 0);
  if (series.length < windowSize) {
    return { trend: 'stable', ready: false, deltaRatio: 0 };
  }
  const window = series.slice(-windowSize);
  const half = windowSize / 2;
  const baseline = average(window, 0, half);
  const current = average(window, half, windowSize);
  if (baseline < minLoudness && current < minLoudness) {
    return { trend: 'stable', ready: true, deltaRatio: 0 };
  }
  const base = Math.max(baseline, minLoudness);
  const deltaRatio = (current - base) / base;
  if (deltaRatio >= approachRatio) {
    return { trend: 'approaching', ready: true, deltaRatio };
  }
  if (deltaRatio <= -recedeRatio) {
    return { trend: 'receding', ready: true, deltaRatio };
  }
  return { trend: 'stable', ready: true, deltaRatio };
}
