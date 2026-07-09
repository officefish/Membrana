export const MIC_COMBINED_DETECTION_PLUGIN_ID = 'mic-combined-detection';

/**
 * Конфиг combined-продюсера. Продюсер аккумулирует окно живого потока и гоняет
 * DSP-детекторы через analyzeSample, сливая их сырой confidence в combinedScore
 * через fusion-ядро (@membrana/detection-ensemble-service → @membrana/core).
 */
export interface MicCombinedDetectionPluginConfig {
  /** Длина аккумулируемого окна анализа, сек (≥ 0.5). */
  windowSec: number;
  /** EMA-сглаживание combinedScore [0..1]; 1 = без сглаживания (мгновенно). */
  smoothing: number;
}

export const defaultMicCombinedDetectionConfig: MicCombinedDetectionPluginConfig = {
  windowSec: 2,
  smoothing: 0.5,
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function resolveMicCombinedDetectionConfig(
  raw: unknown,
): MicCombinedDetectionPluginConfig {
  if (!raw || typeof raw !== 'object') return { ...defaultMicCombinedDetectionConfig };
  const o = raw as Record<string, unknown>;
  return {
    windowSec: clampNumber(o.windowSec, defaultMicCombinedDetectionConfig.windowSec, 0.5, 10),
    smoothing: clampNumber(o.smoothing, defaultMicCombinedDetectionConfig.smoothing, 0, 1),
  };
}
