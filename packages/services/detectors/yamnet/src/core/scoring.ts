/**
 * ND1 — агрегация покадровых score YAMNet в вердикт детектора.
 *
 * Модель отдаёт [nFrames × 521] сигмоидных score (multi-label). Схема агрегации:
 *   1) clip-score класса = среднее по кадрам (устойчиво к одиночным выбросам);
 *   2) drone-score = максимум взвешенных clip-score дрон-релевантных классов
 *      (максимум, а не сумма: классы сильно коррелируют, сумма даёт двойной счёт);
 *   3) isDrone = drone-score >= порога.
 */

import { YAMNET_CLASS_NAMES } from './class-names.js';
import {
  DEFAULT_DRONE_SCORE_THRESHOLD,
  DRONE_CLASSES,
  type DroneClassSpec,
} from './drone-classes.js';

export const YAMNET_NUM_CLASSES = 521;

export interface YamnetScoringOptions {
  /** Порог drone-score для вердикта isDrone. */
  readonly droneScoreThreshold?: number;
  /** Сколько топ-классов включать в reasoning. */
  readonly topClassesCount?: number;
  /** Переопределение набора дрон-классов (для калибровки ND3). */
  readonly droneClasses?: readonly DroneClassSpec[];
}

export interface YamnetVerdict {
  readonly isDrone: boolean;
  /** Итоговый drone-score (0..1) — он же confidence результата. */
  readonly confidence: number;
  /** Человекочитаемое объяснение: топ-классы клипа. */
  readonly reasoning: string;
  /** score дрон-релевантных классов + топ-классы клипа (для features). */
  readonly features: Readonly<Record<string, number>>;
}

/** Среднее по кадрам для каждого из 521 классов. */
export function meanScoresPerClass(frameScores: Float32Array, frameCount: number): Float32Array {
  if (frameCount <= 0 || frameScores.length !== frameCount * YAMNET_NUM_CLASSES) {
    throw new Error(
      `Неверная форма scores: ожидалось ${frameCount}×${YAMNET_NUM_CLASSES}, получено ${frameScores.length}`,
    );
  }
  const mean = new Float32Array(YAMNET_NUM_CLASSES);
  for (let f = 0; f < frameCount; f++) {
    const base = f * YAMNET_NUM_CLASSES;
    for (let c = 0; c < YAMNET_NUM_CLASSES; c++) {
      mean[c]! += frameScores[base + c]!;
    }
  }
  for (let c = 0; c < YAMNET_NUM_CLASSES; c++) mean[c]! /= frameCount;
  return mean;
}

/** Индексы top-N классов по clip-score (убывание). */
export function topClassIndices(clipScores: Float32Array, count: number): number[] {
  return Array.from(clipScores.keys())
    .sort((a, b) => clipScores[b]! - clipScores[a]!)
    .slice(0, Math.max(0, count));
}

/** Собирает вердикт из усреднённых clip-score. */
export function scoreToVerdict(
  clipScores: Float32Array,
  options: YamnetScoringOptions = {},
): YamnetVerdict {
  const threshold = options.droneScoreThreshold ?? DEFAULT_DRONE_SCORE_THRESHOLD;
  const topCount = options.topClassesCount ?? 5;
  const droneClasses = options.droneClasses ?? DRONE_CLASSES;

  let droneScore = 0;
  let bestClass: DroneClassSpec | null = null;
  const features: Record<string, number> = {};
  for (const spec of droneClasses) {
    const raw = clipScores[spec.index] ?? 0;
    const weighted = raw * spec.weight;
    features[`drone:${spec.name}`] = round4(raw);
    if (weighted > droneScore) {
      droneScore = weighted;
      bestClass = spec;
    }
  }

  const top = topClassIndices(clipScores, topCount);
  for (const idx of top) {
    features[`top:${YAMNET_CLASS_NAMES[idx] ?? `class-${idx}`}`] = round4(clipScores[idx] ?? 0);
  }

  const topSummary = top
    .map((idx) => `${YAMNET_CLASS_NAMES[idx] ?? `class-${idx}`} ${round4(clipScores[idx] ?? 0)}`)
    .join(', ');
  const verdictPart = bestClass
    ? `drone-score ${round4(droneScore)} (${bestClass.name})`
    : 'drone-score 0';

  return {
    isDrone: droneScore >= threshold,
    confidence: clamp01(droneScore),
    reasoning: `${verdictPart}; топ клипа: ${topSummary}`,
    features,
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
