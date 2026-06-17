/**
 * Единый источник калибровки DRONE_TIGHT (эпик fft-last-chance #84).
 * Числа берутся из curated-каталога template-match — не дублировать вручную.
 *
 * @see docs/prompts/FFT_METRICS_POTENTIAL_AND_LIMITS.md
 */
import type {
  StrictnessLevel,
  ThresholdTestFrameCount,
  ThresholdTestThresholds,
} from '@membrana/fft-analyzer-service';
import {
  createDefaultTemplateMatchCatalog,
  DEFAULT_CURATED_DRONE_TEMPLATES,
  DEFAULT_INTERVAL_MS,
  DEFAULT_MEASUREMENTS_COUNT,
  DEFAULT_MIN_CONFIDENCE,
} from '@membrana/template-match-detector-service';
import type { PatternTemplate } from '@membrana/trends-detector-service';

export const DRONE_TIGHT_TEMPLATE_KEY = 'DRONE_TIGHT' as const;

/** Каталог trends: DRONE_TIGHT + системные не-дрон конкуренты (как в benchmark-харнессе). */
export function getDroneTightTrendsCatalog(): PatternTemplate[] {
  return createDefaultTemplateMatchCatalog();
}

/** Ключи шаблонов каталога DRONE_TIGHT (для enabledTemplateKeys). */
export function getDroneTightEnabledTemplateKeys(): readonly string[] {
  return getDroneTightTrendsCatalog().map((t) => t.key);
}

export const DRONE_TIGHT_MIN_CONFIDENCE = DEFAULT_MIN_CONFIDENCE;

export const DRONE_TIGHT_TRENDS_INTERVAL_MS = DEFAULT_INTERVAL_MS;
export const DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT = DEFAULT_MEASUREMENTS_COUNT;

/** Спектральные пороги из шаблона DRONE_TIGHT (без frameHitRatio). */
export function getDroneTightSpectralThresholds(): ThresholdTestThresholds {
  const drone = DEFAULT_CURATED_DRONE_TEMPLATES[0];
  if (!drone) {
    throw new Error('DEFAULT_CURATED_DRONE_TEMPLATES is empty');
  }
  return {
    centroid: { ...drone.thresholds.centroid },
    flux: { ...drone.thresholds.flux },
    rms: { ...drone.thresholds.rms },
  };
}

export interface DroneTightFftThresholdDefaults {
  readonly intervalMs: number;
  readonly frameCount: ThresholdTestFrameCount;
  readonly strictness: StrictnessLevel;
  readonly thresholds: ThresholdTestThresholds;
}

/** Пороговый FFT-тест: конфиг B balanced (5×500 мс, normal). */
export const DRONE_TIGHT_FFT_THRESHOLD_DEFAULTS: DroneTightFftThresholdDefaults = {
  intervalMs: DRONE_TIGHT_TRENDS_INTERVAL_MS,
  frameCount: 5,
  strictness: 'normal',
  thresholds: getDroneTightSpectralThresholds(),
};

/**
 * Шаблоны для classifyTrends: каталог DRONE_TIGHT + пользовательские (без дубликатов ключей).
 */
export function mergeDroneTightTrendsTemplates(
  userTemplates: readonly PatternTemplate[],
): PatternTemplate[] {
  const catalog = getDroneTightTrendsCatalog();
  const catalogKeys = new Set(catalog.map((t) => t.key));
  const extra = userTemplates.filter((t) => !catalogKeys.has(t.key));
  return [...catalog, ...extra];
}

/** isDrone по вердикту trends: обнаружено и победитель — DRONE_*. */
export function isDroneTightTrendsDetection(
  detectedState: string,
  isDetected: boolean,
): boolean {
  return isDetected && detectedState.startsWith('DRONE');
}
