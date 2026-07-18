/** Витрина качества детекции — эпик detector-scoreboard, фаза Ф1. */

export const MIC_DETECTOR_SCOREBOARD_PLUGIN_ID = 'mic-detector-scoreboard';

/**
 * Строка витрины в языке датчика.
 *
 * Штуки — первичны, доли — производны: на выборке в шесть десятков записей
 * процент прячет масштаб, а «55 из 60» его показывает. Интервал обязателен —
 * без него читатель не отличит измерение от обещания.
 */
export interface ScoreboardRow {
  readonly detector: string;
  /** Чем детектор считает: спектральный анализ, нейросеть, нейросеть с обучением. */
  readonly family: 'dsp' | 'neural' | 'neural-trained';
  /** Набор и его объём — цифра без набора не сравнима. */
  readonly datasetLabel: string;
  readonly datasetSize: number;
  /** Обнаружено дронов: сколько из скольких. */
  readonly detected: number;
  readonly dronesTotal: number;
  /** Ложных тревог: сколько из скольких чистых записей. */
  readonly falseAlarms: number;
  readonly cleanTotal: number;
  /** 95% интервал вероятности обнаружения, доли. */
  readonly pdInterval: readonly [number, number];
  /** Ранжирующая способность; null — не мерена для этой строки. */
  readonly rocAuc: number | null;
  /** Откуда число: файл отчёта или прогон. Строка без провенанса — не доказательство. */
  readonly source: string;
  /** Оговорка, без которой строку прочтут оптимистичнее, чем она есть. */
  readonly caveat?: string;
}

export interface MicDetectorScoreboardPluginConfig {
  /** Показывать ли столбцы долей рядом со штуками. */
  readonly showPercents: boolean;
}

export const defaultMicDetectorScoreboardConfig: MicDetectorScoreboardPluginConfig = {
  showPercents: true,
};

export function resolveMicDetectorScoreboardConfig(
  raw: unknown,
): MicDetectorScoreboardPluginConfig {
  if (raw == null || typeof raw !== 'object') return defaultMicDetectorScoreboardConfig;
  const showPercents = (raw as { showPercents?: unknown }).showPercents;
  return {
    showPercents:
      typeof showPercents === 'boolean'
        ? showPercents
        : defaultMicDetectorScoreboardConfig.showPercents,
  };
}

/** Вероятность обнаружения — доля обнаруженных среди дронов. */
export function probabilityOfDetection(row: ScoreboardRow): number {
  return row.dronesTotal === 0 ? 0 : row.detected / row.dronesTotal;
}

/** Вероятность ложной тревоги — доля сработавших среди чистых записей. */
export function probabilityOfFalseAlarm(row: ScoreboardRow): number {
  return row.cleanTotal === 0 ? 0 : row.falseAlarms / row.cleanTotal;
}
