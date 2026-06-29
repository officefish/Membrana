/**
 * Настройки узла Sequence (Then 0..N, optional parallel async).
 * @see docs/prompts/DEVICE_BOARD_EXEC_SEQUENCE_EPIC_PROMPT.md
 */

export const MIN_SCENARIO_SEQUENCE_THEN_COUNT = 1;
export const MAX_SCENARIO_SEQUENCE_THEN_COUNT = 9;

/** Конфигурация узла Sequence на канвасе. */
export interface ScenarioSequenceConfig {
  /** Количество выходов Then (1..9). */
  readonly thenCount: number;
  /** Параллельный запуск Then-веток (требует async-capable узлов). */
  readonly parallelAsync: boolean;
  /**
   * Latent Then: стартовать Then-ветку без await завершения перед следующим Then.
   * Не смешивать с `parallelAsync` на одном узле (pre-run forbidden).
   */
  readonly latentThen: boolean;
}

export const DEFAULT_SCENARIO_SEQUENCE_CONFIG: ScenarioSequenceConfig = {
  thenCount: 2,
  parallelAsync: false,
  latentThen: false,
};

function clampThenCount(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SCENARIO_SEQUENCE_CONFIG.thenCount;
  }
  return Math.min(
    MAX_SCENARIO_SEQUENCE_THEN_COUNT,
    Math.max(MIN_SCENARIO_SEQUENCE_THEN_COUNT, Math.round(value)),
  );
}

/** Нормализует partial config после hydrate или UI. */
export function resolveScenarioSequenceConfig(
  raw: Partial<ScenarioSequenceConfig> | undefined | null,
): ScenarioSequenceConfig {
  const base = DEFAULT_SCENARIO_SEQUENCE_CONFIG;
  if (raw === undefined || raw === null || typeof raw !== 'object') {
    return base;
  }
  return {
    thenCount: clampThenCount(raw.thenCount ?? base.thenCount),
    parallelAsync: raw.parallelAsync === true,
    latentThen: raw.latentThen === true,
  };
}

/** True, если value — валидный объект sequence config. */
export function isScenarioSequenceConfig(value: unknown): value is ScenarioSequenceConfig {
  if (value === null || typeof value !== 'object') {
    return false;
  }
  const o = value as Record<string, unknown>;
  return (
    typeof o.thenCount === 'number' &&
    typeof o.parallelAsync === 'boolean' &&
    typeof o.latentThen === 'boolean'
  );
}

/** Pre-run: parallelAsync и latentThen взаимоисключающи. */
export function isScenarioSequenceModeConflict(config: ScenarioSequenceConfig): boolean {
  return config.parallelAsync && config.latentThen;
}
