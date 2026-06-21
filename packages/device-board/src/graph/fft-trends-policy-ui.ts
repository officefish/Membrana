import {
  FFT_TRENDS_INTERVAL_MS_PRESETS,
  FFT_TRENDS_MEASUREMENT_COUNT_PRESETS,
  resolveScenarioFftTrendsPolicy,
  type ScenarioFftTrendsBuiltinTemplateKey,
  type ScenarioFftTrendsDetectionMode,
  type ScenarioFftTrendsIntervalMs,
  type ScenarioFftTrendsMeasurementCount,
  type ScenarioFftTrendsPolicy,
} from '@membrana/core';

/** Подписи shipped-шаблонов для инспектора (parity с SYSTEM_TEMPLATES / plugin sidebar). */
export const FFT_TRENDS_BUILTIN_TEMPLATE_LABELS: Record<
  ScenarioFftTrendsBuiltinTemplateKey,
  string
> = {
  DRONE_TIGHT: '🛸 Дрон (tight)',
  WIND: '💨 Ветер',
  QUIET: '🤫 Тишина',
  TRAFFIC: '🚗 Трафик',
  BIRDS: '🐦 Птицы',
  VOICE: '🗣️ Голос',
};

export function fftTrendsBuiltinTemplateLabel(key: ScenarioFftTrendsBuiltinTemplateKey): string {
  return FFT_TRENDS_BUILTIN_TEMPLATE_LABELS[key] ?? key;
}

/** Бейдж на канвасе: «20×500ms · auto · 6 tpl». */
export function formatFftTrendsPolicyBadge(
  raw: Partial<ScenarioFftTrendsPolicy> | undefined | null,
): string {
  const policy = resolveScenarioFftTrendsPolicy(raw);
  const tplCount = policy.enabledTemplateKeys.length;
  return `${policy.measurementsCount}×${policy.intervalMs}ms · ${policy.detectionMode} · ${tplCount} tpl`;
}

/** Подпись режима в инспекторе. */
export function fftTrendsDetectionModeLabel(mode: ScenarioFftTrendsDetectionMode): string {
  return mode === 'manual' ? 'Ручной' : 'Авто';
}

/** Длительность окна (с) — как analysisDurationSec в plugin. */
export function fftTrendsPolicyDurationSec(
  raw: Partial<ScenarioFftTrendsPolicy> | undefined | null,
): number {
  const policy = resolveScenarioFftTrendsPolicy(raw);
  return (policy.measurementsCount * policy.intervalMs) / 1000;
}

export { FFT_TRENDS_INTERVAL_MS_PRESETS, FFT_TRENDS_MEASUREMENT_COUNT_PRESETS };
export type {
  ScenarioFftTrendsDetectionMode,
  ScenarioFftTrendsIntervalMs,
  ScenarioFftTrendsMeasurementCount,
  ScenarioFftTrendsPolicy,
};
