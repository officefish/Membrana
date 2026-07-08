export const MIC_PROXIMITY_ALARM_PLUGIN_ID = 'mic-proximity-alarm';

export interface MicProximityAlarmPluginConfig {
  /** Порог combinedScore (из fusion-ядра A), при котором тревога активна. */
  scoreThreshold: number;
  /** Длина окна тренда громкости (кадров, чётное ≥ 2). */
  windowSize: number;
  /** Порог относительного РОСТА громкости для «приближается». */
  approachRatio: number;
  /** Порог относительного ПАДЕНИЯ громкости для «удаляется» (асимметрия ближе/дальше). */
  recedeRatio: number;
}

export const defaultMicProximityAlarmConfig: MicProximityAlarmPluginConfig = {
  scoreThreshold: 0.5,
  windowSize: 12,
  approachRatio: 0.15,
  recedeRatio: 0.15,
};

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export function resolveMicProximityAlarmConfig(raw: unknown): MicProximityAlarmPluginConfig {
  if (!raw || typeof raw !== 'object') return { ...defaultMicProximityAlarmConfig };
  const o = raw as Record<string, unknown>;
  return {
    scoreThreshold: clampNumber(o.scoreThreshold, defaultMicProximityAlarmConfig.scoreThreshold, 0, 1),
    windowSize: clampNumber(o.windowSize, defaultMicProximityAlarmConfig.windowSize, 2, 64),
    approachRatio: clampNumber(o.approachRatio, defaultMicProximityAlarmConfig.approachRatio, 0.01, 1),
    recedeRatio: clampNumber(o.recedeRatio, defaultMicProximityAlarmConfig.recedeRatio, 0.01, 1),
  };
}
