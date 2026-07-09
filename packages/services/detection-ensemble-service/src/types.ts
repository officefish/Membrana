import type { DetectionResult, DetectorFamily } from '@membrana/detector-base';
import type { DetectionFusionResult } from '@membrana/core';

/**
 * Снимок одного детектора по окну — вход слияния.
 *
 * `result === null` означает, что детектор МОЛЧАЛ по этому окну (нет модели,
 * окно пропущено, инференс упал). Молчащий не участвует в combinedScore и
 * agreement (ядро трактует его как `present: false`).
 */
export interface DetectorSnapshot {
  /** Стабильный id детектора, напр. 'trends' | 'yamnet'. */
  readonly name: string;
  /** Семейство ('dsp' | 'neural' | 'agentic') — переносится в fusion как метка. */
  readonly family: DetectorFamily;
  /** Результат detect() по окну, либо null — детектор молчал. */
  readonly result: DetectionResult | null;
  /**
   * Вес источника в слиянии (по умолчанию 1 — равный голос). Позволяет отдать
   * нейро (yamnet) больший вес как основному hard-gate.
   */
  readonly weight?: number;
}

/**
 * Результат продюсера по одному окну = результат fusion-ядра
 * (`combinedScore`, `agreement`, `presentCount`, `perSource`) + сглаженный во
 * времени `smoothedScore`.
 */
export interface EnsembleResult extends DetectionFusionResult {
  /**
   * combinedScore после EMA-сглаживания по последовательности окон.
   * При `smoothing: 1` (по умолчанию) равен мгновенному `combinedScore`.
   */
  readonly smoothedScore: number;
}

/** Конфигурация продюсера. */
export interface EnsembleProducerOptions {
  /**
   * EMA-фактор сглаживания combinedScore в [0..1]: 1 — без сглаживания
   * (выход = мгновенный score), ближе к 0 — тяжелее сглаживание (инерция).
   * Значения вне [0..1] и NaN трактуются как 1. По умолчанию 1.
   */
  readonly smoothing?: number;
  /**
   * Веса детекторов по имени; переопределяют равный вес 1 (напр.
   * `{ yamnet: 2, trends: 1 }`). Вес из `DetectorSnapshot.weight` при прямом
   * вызове `fuseDetectorResults` имеет приоритет; здесь — для инъецированных.
   */
  readonly weights?: Readonly<Record<string, number>>;
}
