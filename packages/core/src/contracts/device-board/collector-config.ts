/**
 * Настройки Collect-узлов v0.5 (хранятся в `ScenarioGraphNode.collectorConfig` / canvas data).
 * Policy на device singleton — out of scope MVP; defaults из mic plugins.
 * @see docs/prompts/DEVICE_BOARD_COLLECTORS_V05_EPIC_PROMPT.md
 */

/** Конфигурация накопителя CollectSamples / CollectFftFrames. */
export interface ScenarioCollectorConfig {
  /** FFT / LiveSampler buffer size (mic-stream-viz default: 2048). */
  readonly bufferSize: number;
  /** Analyser smoothing 0..1 (default: 0.75). */
  readonly smoothingTimeConstant: number;
  /** Wall-clock окно flush, сек (StreamWindowCollector default: 3). */
  readonly windowSec: number;
  /** Flush при count >= queueCapacity (OR с windowSec). */
  readonly queueCapacity: number;
}

/** Defaults MVP (microphone-stream-viz + mic-live-drone-analysis). */
export const DEFAULT_SCENARIO_COLLECTOR_CONFIG: ScenarioCollectorConfig = {
  bufferSize: 2048,
  smoothingTimeConstant: 0.75,
  windowSec: 3,
  queueCapacity: 10,
};

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}

/**
 * Нормализует partial/raw config после hydrate или UI.
 * Невалидные поля заменяются defaults.
 */
export function resolveScenarioCollectorConfig(
  raw: Partial<ScenarioCollectorConfig> | undefined | null,
): ScenarioCollectorConfig {
  const base = DEFAULT_SCENARIO_COLLECTOR_CONFIG;
  if (raw === undefined || raw === null || typeof raw !== 'object') {
    return base;
  }
  return {
    bufferSize: clampNumber(raw.bufferSize ?? base.bufferSize, 64, 32768),
    smoothingTimeConstant: clampNumber(
      raw.smoothingTimeConstant ?? base.smoothingTimeConstant,
      0,
      1,
    ),
    windowSec: clampNumber(raw.windowSec ?? base.windowSec, 0.1, 120),
    queueCapacity: clampNumber(raw.queueCapacity ?? base.queueCapacity, 1, 10_000),
  };
}

/** True, если value — объект с числовыми полями collector config. */
export function isScenarioCollectorConfig(value: unknown): value is ScenarioCollectorConfig {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.bufferSize === 'number' &&
    typeof o.smoothingTimeConstant === 'number' &&
    typeof o.windowSec === 'number' &&
    typeof o.queueCapacity === 'number'
  );
}
