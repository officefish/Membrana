/**
 * Политика FFT trends-анализа v0.8 (MakeFftTrendsPolicy → MakeFftTrendsAnalysis).
 * Enum-параметры — parity с trends-fft-analyzer plugin.
 * @see docs/prompts/DEVICE_BOARD_TRENDS_FFT_PARITY_V08_EPIC_PROMPT.md
 */

/** Режим детекции — как TrendsDetectionMode в plugin. */
export const FFT_TRENDS_DETECTION_MODES = ['auto', 'manual'] as const;

export type ScenarioFftTrendsDetectionMode = (typeof FFT_TRENDS_DETECTION_MODES)[number];

/** Presets числа замеров в окне (plugin QuickPresetButtons). */
export const FFT_TRENDS_MEASUREMENT_COUNT_PRESETS = [5, 20, 50, 100, 180, 300] as const;

export type ScenarioFftTrendsMeasurementCount =
  (typeof FFT_TRENDS_MEASUREMENT_COUNT_PRESETS)[number];

/** Presets интервала между замерами (мс) — plugin INTERVAL_MS_PRESETS. */
export const FFT_TRENDS_INTERVAL_MS_PRESETS = [50, 100, 200, 500, 1000] as const;

export type ScenarioFftTrendsIntervalMs = (typeof FFT_TRENDS_INTERVAL_MS_PRESETS)[number];

/**
 * Shipped template keys (tariff/catalog). Порядок = plugin getDroneTightEnabledTemplateKeys():
 * curated DRONE_TIGHT + SYSTEM_TEMPLATES без bootstrap DRONE (WIND, QUIET, TRAFFIC, BIRDS, VOICE).
 * Пользовательские шаблоны — runtime в bridge; в policy только ключи с галочками.
 */
export const FFT_TRENDS_BUILTIN_TEMPLATE_KEYS = [
  'DRONE_TIGHT',
  'WIND',
  'QUIET',
  'TRAFFIC',
  'BIRDS',
  'VOICE',
] as const;

export type ScenarioFftTrendsBuiltinTemplateKey =
  (typeof FFT_TRENDS_BUILTIN_TEMPLATE_KEYS)[number];

/** Параметры trends-анализа на device-board (enum-first). */
export interface ScenarioFftTrendsPolicy {
  readonly detectionMode: ScenarioFftTrendsDetectionMode;
  readonly measurementsCount: ScenarioFftTrendsMeasurementCount;
  readonly intervalMs: ScenarioFftTrendsIntervalMs;
  /** Порог confidence для classifyTrends (0..1). */
  readonly minConfidence: number;
  /** Минимальный RMS для учёта кадра (0..1). */
  readonly minRms: number;
  /** Ключи шаблонов, участвующих в classifyTrends (галочки как в plugin sidebar). */
  readonly enabledTemplateKeys: readonly string[];
}

/** Defaults — parity с plugin resolveTrendsFftAnalyzerConfig (10×500 ms → nearest enum). */
export const DEFAULT_FFT_TRENDS_POLICY: ScenarioFftTrendsPolicy = {
  detectionMode: 'auto',
  measurementsCount: 20,
  intervalMs: 500,
  minConfidence: 0.55,
  minRms: 0.02,
  enabledTemplateKeys: [...FFT_TRENDS_BUILTIN_TEMPLATE_KEYS],
};

function isDetectionMode(value: string): value is ScenarioFftTrendsDetectionMode {
  return (FFT_TRENDS_DETECTION_MODES as readonly string[]).includes(value);
}

function isMeasurementPreset(value: number): value is ScenarioFftTrendsMeasurementCount {
  return (FFT_TRENDS_MEASUREMENT_COUNT_PRESETS as readonly number[]).includes(value);
}

function isIntervalPreset(value: number): value is ScenarioFftTrendsIntervalMs {
  return (FFT_TRENDS_INTERVAL_MS_PRESETS as readonly number[]).includes(value);
}

function nearestPreset<T extends number>(raw: number, presets: readonly T[], fallback: T): T {
  if (!Number.isFinite(raw) || raw <= 0) {
    return fallback;
  }
  let best: T = fallback;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const preset of presets) {
    const delta = Math.abs(preset - raw);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = preset;
    }
  }
  return best;
}

function clampUnit(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, value));
}

function normalizeEnabledTemplateKeys(
  raw: readonly string[] | undefined,
  fallback: readonly string[],
): readonly string[] {
  if (raw === undefined || !Array.isArray(raw) || raw.length === 0) {
    return [...fallback];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const key of raw) {
    if (typeof key !== 'string' || key.length === 0 || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(key);
  }
  return out.length > 0 ? out : [...fallback];
}

/** Нормализует partial policy после hydrate или MakeFftTrendsPolicy. */
export function resolveScenarioFftTrendsPolicy(
  raw: Partial<ScenarioFftTrendsPolicy> | undefined | null,
): ScenarioFftTrendsPolicy {
  const base = DEFAULT_FFT_TRENDS_POLICY;
  if (raw === undefined || raw === null || typeof raw !== 'object') {
    return base;
  }
  const detectionMode =
    typeof raw.detectionMode === 'string' && isDetectionMode(raw.detectionMode)
      ? raw.detectionMode
      : base.detectionMode;
  const measurementsCount =
    typeof raw.measurementsCount === 'number' && isMeasurementPreset(raw.measurementsCount)
      ? raw.measurementsCount
      : typeof raw.measurementsCount === 'number'
        ? nearestPreset(raw.measurementsCount, FFT_TRENDS_MEASUREMENT_COUNT_PRESETS, base.measurementsCount)
        : base.measurementsCount;
  const intervalMs =
    typeof raw.intervalMs === 'number' && isIntervalPreset(raw.intervalMs)
      ? raw.intervalMs
      : typeof raw.intervalMs === 'number'
        ? nearestPreset(raw.intervalMs, FFT_TRENDS_INTERVAL_MS_PRESETS, base.intervalMs)
        : base.intervalMs;
  return {
    detectionMode,
    measurementsCount,
    intervalMs,
    minConfidence: clampUnit(raw.minConfidence ?? base.minConfidence, base.minConfidence),
    minRms: clampUnit(raw.minRms ?? base.minRms, base.minRms),
    enabledTemplateKeys: normalizeEnabledTemplateKeys(raw.enabledTemplateKeys, base.enabledTemplateKeys),
  };
}

/** True, если value — полный ScenarioFftTrendsPolicy. */
export function isScenarioFftTrendsPolicy(value: unknown): value is ScenarioFftTrendsPolicy {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.detectionMode === 'string' &&
    isDetectionMode(o.detectionMode) &&
    typeof o.measurementsCount === 'number' &&
    isMeasurementPreset(o.measurementsCount) &&
    typeof o.intervalMs === 'number' &&
    isIntervalPreset(o.intervalMs) &&
    typeof o.minConfidence === 'number' &&
    typeof o.minRms === 'number' &&
    Array.isArray(o.enabledTemplateKeys) &&
    o.enabledTemplateKeys.every((k) => typeof k === 'string')
  );
}

/** Длительность окна анализа (сек) для smoke/validation. */
export function fftTrendsAnalysisDurationSec(policy: ScenarioFftTrendsPolicy): number {
  return (policy.measurementsCount * policy.intervalMs) / 1000;
}
