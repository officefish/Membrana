/**
 * Alarm-loop «ближе/дальше» (Задача B) — чистая логика тренда громкости.
 *
 * Индикатор оценивает НАПРАВЛЕНИЕ изменения громкости живого микрофона:
 * «приближается / удаляется / стабильно». Это ГРУБАЯ громкость сцены, НЕ
 * координата и НЕ расстояние — источник может двигаться, менять ориентацию или
 * громкость. Порог реальной тревоги завязан на combinedScore fusion-ядра
 * (см. evaluateProximityAlarm), а не на самой громкости.
 *
 * Всё здесь — pure/stateful без React, DOM и Web Audio (по образцу
 * SpectralFluxTracker). Громкость кадра считается снаружи `frameLoudness`.
 */

export type LoudnessTrend = 'approaching' | 'receding' | 'stable';

export interface LoudnessTrendResult {
  /** Направление изменения громкости. До накопления окна — 'stable'. */
  readonly trend: LoudnessTrend;
  /** Последнее поданное значение громкости. */
  readonly loudness: number;
  /** Среднее «старшей» половины окна — база сравнения. 0 до готовности. */
  readonly baseline: number;
  /** Относительное изменение (currentAvg − baseline) / baseline, знаковое. 0 до готовности. */
  readonly deltaRatio: number;
  /** Накоплено ли полное окно (иначе тренд не судим). */
  readonly ready: boolean;
}

export interface LoudnessTrendOptions {
  /**
   * Длина скользящего окна (кадров). Делится пополам: старшая половина — база,
   * младшая — текущее. Чётное значение ≥ 2. Default 12.
   */
  readonly windowSize?: number;
  /** Относительный рост текущего над базой, чтобы назвать 'approaching'. Default 0.15. */
  readonly approachRatio?: number;
  /** Относительное падение, чтобы назвать 'receding'. Default 0.15. */
  readonly recedeRatio?: number;
  /** Ниже этой громкости сцена считается тишиной → 'stable' (без деления на шум). Default 1e-4. */
  readonly minLoudness?: number;
}

const DEFAULT_WINDOW_SIZE = 12;
const DEFAULT_APPROACH_RATIO = 0.15;
const DEFAULT_RECEDE_RATIO = 0.15;
const DEFAULT_MIN_LOUDNESS = 1e-4;

const STABLE_RESULT_BASE = {
  trend: 'stable' as const,
  baseline: 0,
  deltaRatio: 0,
  ready: false,
};

function average(values: readonly number[], from: number, to: number): number {
  let sum = 0;
  for (let i = from; i < to; i++) {
    sum += values[i]!;
  }
  const count = to - from;
  return count > 0 ? sum / count : 0;
}

/**
 * Stateful-трекер тренда громкости по скользящему окну.
 * Сравнивает среднее младшей половины окна (сейчас) со старшей (база).
 */
export class LoudnessTrendTracker {
  private readonly windowSize: number;
  private readonly half: number;
  private readonly approachRatio: number;
  private readonly recedeRatio: number;
  private readonly minLoudness: number;
  private readonly buffer: number[] = [];

  constructor(options: LoudnessTrendOptions = {}) {
    const requested = options.windowSize ?? DEFAULT_WINDOW_SIZE;
    // Окно должно быть чётным ≥ 2, чтобы делиться на равные половины.
    const normalized = Number.isFinite(requested) ? Math.floor(requested) : DEFAULT_WINDOW_SIZE;
    this.windowSize = Math.max(2, normalized % 2 === 0 ? normalized : normalized + 1);
    this.half = this.windowSize / 2;
    this.approachRatio = options.approachRatio ?? DEFAULT_APPROACH_RATIO;
    this.recedeRatio = options.recedeRatio ?? DEFAULT_RECEDE_RATIO;
    this.minLoudness = options.minLoudness ?? DEFAULT_MIN_LOUDNESS;
  }

  /** Подать громкость очередного кадра, получить оценку тренда. */
  next(loudness: number): LoudnessTrendResult {
    const value = Number.isFinite(loudness) && loudness > 0 ? loudness : 0;
    this.buffer.push(value);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    if (this.buffer.length < this.windowSize) {
      return { ...STABLE_RESULT_BASE, loudness: value };
    }

    const baseline = average(this.buffer, 0, this.half);
    const current = average(this.buffer, this.half, this.windowSize);

    // Тишина: обе половины ниже порога — тренд не судим, чтобы не делить на шум.
    if (current < this.minLoudness && baseline < this.minLoudness) {
      return { trend: 'stable', loudness: value, baseline, deltaRatio: 0, ready: true };
    }

    const deltaRatio = baseline > 0 ? (current - baseline) / baseline : 0;
    let trend: LoudnessTrend = 'stable';
    if (deltaRatio >= this.approachRatio) {
      trend = 'approaching';
    } else if (deltaRatio <= -this.recedeRatio) {
      trend = 'receding';
    }

    return { trend, loudness: value, baseline, deltaRatio, ready: true };
  }

  /** Сбросить накопленное окно (начало нового потока/анализа). */
  reset(): void {
    this.buffer.length = 0;
  }
}

// ============= Гейт тревоги (порог на combinedScore из fusion-ядра A) =============

export interface ProximityAlarmInput {
  /** Комбинированный score из fuseDetectorConfidences (@membrana/core), [0..1]. */
  readonly combinedScore: number;
  /** Направление громкости из LoudnessTrendTracker. */
  readonly trend: LoudnessTrend;
}

export interface ProximityAlarmOptions {
  /** Порог combinedScore, при котором тревога активна. Default 0.5. */
  readonly scoreThreshold?: number;
}

export interface ProximityAlarmResult {
  /** Тревога активна: combinedScore ≥ порога. Само по себе — не про громкость. */
  readonly active: boolean;
  /** Усиление: тревога активна И источник приближается (громче). */
  readonly rising: boolean;
  /** Ослабление: тревога активна И источник удаляется (тише). */
  readonly easing: boolean;
}

const DEFAULT_SCORE_THRESHOLD = 0.5;

/**
 * Оценить тревогу combined UC: активность определяет ТОЛЬКО combinedScore из
 * fusion-ядра A (не громкость), а тренд громкости лишь модулирует «усиливается /
 * ослабевает». Разделение сознательное: громкость — грубый индикатор сцены, а
 * решение о дроне принимает слияние детекторов.
 */
export function evaluateProximityAlarm(
  input: ProximityAlarmInput,
  options: ProximityAlarmOptions = {},
): ProximityAlarmResult {
  const threshold = options.scoreThreshold ?? DEFAULT_SCORE_THRESHOLD;
  const score = Number.isFinite(input.combinedScore) ? input.combinedScore : 0;
  const active = score >= threshold;
  return {
    active,
    rising: active && input.trend === 'approaching',
    easing: active && input.trend === 'receding',
  };
}
