import {
  fuseDetectorConfidences,
  type DetectionFusionResult,
  type FusionSourceInput,
} from '@membrana/core';
import type { AudioWindow, DroneDetector } from '@membrana/detector-base';
import type {
  DetectorSnapshot,
  EnsembleProducerOptions,
  EnsembleResult,
} from './types.js';

/**
 * Combined-продюсер: питает `combinedScore` из fusion-ядра `@membrana/core`.
 *
 * Ядро (`fuseDetectorConfidences`) считает СЛИЯНИЕ (взвешенное среднее сырого
 * confidence + agreement, БЕЗ бинарного OR). Этот сервис лишь ОРКЕСТРИРУЕТ:
 * гоняет инъецированные детекторы (`DroneDetector`) на окне, маппит их
 * результаты в `FusionSourceInput`, зовёт ядро и сглаживает score во времени.
 *
 * Детекторы приходят ТОЛЬКО через контракт `DroneDetector` из
 * `@membrana/detector-base` — сервис НЕ импортирует конкретные analyzer/detector
 * сервисы (trends/yamnet/orchestrator). Это держит слой analyzer чистым.
 */

/** Снимок молчащего детектора → present:false для ядра. */
export function detectorSnapshotToFusionInput(
  snapshot: DetectorSnapshot,
): FusionSourceInput {
  const present = snapshot.result !== null;
  return {
    name: snapshot.name,
    family: snapshot.family,
    confidence: present ? snapshot.result!.confidence : 0,
    isDrone: present ? snapshot.result!.isDrone : false,
    weight: snapshot.weight,
    present,
  };
}

/**
 * Чистое слияние снимков детекторов через fusion-ядро.
 *
 * Молчащий детектор (`result === null`) не участвует в combinedScore/agreement.
 * Согласие high↔high → высокий score, agreement ≈ 1; расхождение high↔low →
 * середина, низкий agreement — ровно как определяет ядро.
 */
export function fuseDetectorResults(
  snapshots: readonly DetectorSnapshot[],
): DetectionFusionResult {
  return fuseDetectorConfidences(snapshots.map(detectorSnapshotToFusionInput));
}

/** undefined/NaN/вне [0..1] → 1 (без сглаживания). */
function normalizeSmoothing(smoothing: number | undefined): number {
  if (smoothing === undefined || !Number.isFinite(smoothing)) return 1;
  if (smoothing < 0) return 0;
  if (smoothing > 1) return 1;
  return smoothing;
}

/**
 * Продюсер над потоком окон: держит EMA `combinedScore` во времени.
 *
 * Инъекция детекторов (не импорт сервисов) — потребитель (плагин «Микрофона»)
 * передаёт живые trends + yamnet как `DroneDetector[]`.
 */
export class EnsembleProducer {
  private readonly detectors: readonly DroneDetector[];
  private readonly alpha: number;
  private readonly weights: Readonly<Record<string, number>>;
  private ema: number | null = null;

  constructor(
    detectors: readonly DroneDetector[],
    options: EnsembleProducerOptions = {},
  ) {
    this.detectors = detectors;
    this.alpha = normalizeSmoothing(options.smoothing);
    this.weights = options.weights ?? {};
  }

  /**
   * Прогнать все детекторы на окне и слить в `combinedScore`.
   *
   * Устойчивость: если детектор бросает исключение — он трактуется как
   * молчащий (present:false), ансамбль не рушится.
   */
  async analyze(window: AudioWindow): Promise<EnsembleResult> {
    const snapshots = await Promise.all(
      this.detectors.map((detector) => this.runDetector(detector, window)),
    );
    const fusion = fuseDetectorResults(snapshots);
    const smoothedScore = this.applyEma(fusion.combinedScore, fusion.presentCount);
    return { ...fusion, smoothedScore };
  }

  /** Сбросить накопленное EMA-состояние (напр. при рестарте потока). */
  reset(): void {
    this.ema = null;
  }

  private async runDetector(
    detector: DroneDetector,
    window: AudioWindow,
  ): Promise<DetectorSnapshot> {
    const weight = this.weights[detector.name];
    try {
      const result = await detector.detect(window);
      return { name: detector.name, family: detector.family, result, weight };
    } catch {
      // Детектор упал по этому окну → молчит, не рушим ансамбль.
      return { name: detector.name, family: detector.family, result: null, weight };
    }
  }

  /**
   * EMA: `ema = α·score + (1−α)·ema_prev`. α=1 → выход = мгновенный score.
   * Окно без присутствующих детекторов (presentCount 0) не двигает EMA —
   * держим прошлое сглаженное (или 0, если сигнала ещё не было).
   */
  private applyEma(score: number, presentCount: number): number {
    if (presentCount === 0) {
      return this.ema ?? 0;
    }
    if (this.ema === null || this.alpha >= 1) {
      this.ema = score;
      return score;
    }
    this.ema = this.alpha * score + (1 - this.alpha) * this.ema;
    return this.ema;
  }
}
