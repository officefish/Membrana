import type { AudioWindow, DetectionResult, DroneDetector } from '@membrana/detector-base';

/**
 * Субдискретизация нейро-ветви combined (консилиум live-neural-combined-fusion
 * 2026-07-13, точка 3): нейро-инференс дороже DSP, а сигнатура дрона стационарна
 * на масштабе секунд — гоняем модель РЕЖЕ DSP. Между опросами ансамблю подаётся
 * последний результат (present:true); при протухании TTL обёртка бросает —
 * EnsembleProducer переводит источник в present:false (graceful, ансамбль живёт).
 *
 * TTL/каденс — ВНУТРЕННЯЯ деталь продюсера, не публичный API: наружу течёт только
 * `present` через perSource. Часы инжектируются ради детерминизма тестов.
 */

export interface NeuralTtlOptions {
  /** Не опрашивать модель чаще, чем раз в этот интервал. */
  readonly pollIntervalMs: number;
  /** Возраст последнего успешного результата, после которого источник «протух». */
  readonly ttlMs: number;
  /** Инжектируемые часы (тесты); по умолчанию Date.now. */
  readonly now?: () => number;
}

/**
 * Каденс нейро по умолчанию: опрос ~каждое 3-е окно (windowSec 2с → раз в 6с),
 * протухание после ~2.5 пропущенных опросов. При выходе браузерного p95 за живой
 * каденс снижаем частоту нейро-опроса, НЕ DSP (вердикт консилиума, точка 3/6).
 */
export const DEFAULT_NEURAL_TTL_OPTIONS: NeuralTtlOptions = {
  pollIntervalMs: 6_000,
  ttlMs: 15_000,
};

/** Обернуть нейро-детектор в субдискретизацию с TTL-кэшем последнего результата. */
export function wrapNeuralWithTtl(
  detector: DroneDetector,
  options: NeuralTtlOptions = DEFAULT_NEURAL_TTL_OPTIONS,
): DroneDetector {
  const now = options.now ?? Date.now;
  let lastResult: DetectionResult | null = null;
  let lastSuccessAt = Number.NEGATIVE_INFINITY;
  let lastAttemptAt = Number.NEGATIVE_INFINITY;

  return {
    name: detector.name,
    family: detector.family,
    async detect(window: AudioWindow): Promise<DetectionResult> {
      const t = now();
      const cacheFresh = (): boolean =>
        lastResult !== null && t - lastSuccessAt <= options.ttlMs;

      if (t - lastAttemptAt >= options.pollIntervalMs) {
        lastAttemptAt = t;
        try {
          lastResult = await detector.detect(window);
          lastSuccessAt = now();
          return lastResult;
        } catch (error) {
          // Транзиентный отказ опроса НЕ роняет модальность мгновенно: свежий
          // по TTL кэш продолжает отвечать (availability-семантика точки 4).
          // Протухание решает только TTL.
          if (cacheFresh()) return lastResult as DetectionResult;
          lastResult = null;
          throw error;
        }
      }
      if (cacheFresh()) {
        return lastResult as DetectionResult;
      }
      // Кэша нет или протух → молчим до следующего опроса (present:false в ансамбле).
      throw new Error(`${detector.name}: нейро-результат протух (TTL ${options.ttlMs}мс)`);
    },
  };
}
