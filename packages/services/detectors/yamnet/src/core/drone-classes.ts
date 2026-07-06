/**
 * ND1 — маппинг классов AudioSet на «дрон-релевантный» сигнал.
 *
 * Канон: INTEGRATIONS_STRATEGY §4.2.1 (0.2) — score по Aircraft / Helicopter /
 * Propeller, airscrew / Engine. Расширено соседями семейства по yamnet_class_map.csv:
 * Light engine (high frequency) — ближайший к тону квадрокоптера класс, Buzz — слабый
 * вспомогательный сигнал (жужжание). Веса — априорная близость класса к звуку дрона,
 * НЕ обучены; калибровка порога — ND3 на free-v1.
 */

export interface DroneClassSpec {
  /** Индекс класса в выходе YAMNet (0..520). */
  readonly index: number;
  /** Имя класса AudioSet (для reasoning/features). */
  readonly name: string;
  /** Вес вклада класса в агрегированный drone-score (0..1]. */
  readonly weight: number;
}

/** Дрон-релевантные классы AudioSet (индексы из assets/yamnet_class_map.csv). */
export const DRONE_CLASSES: readonly DroneClassSpec[] = [
  { index: 332, name: 'Propeller, airscrew', weight: 1 },
  { index: 333, name: 'Helicopter', weight: 1 },
  { index: 338, name: 'Light engine (high frequency)', weight: 1 },
  { index: 329, name: 'Aircraft', weight: 0.9 },
  { index: 330, name: 'Aircraft engine', weight: 0.9 },
  { index: 334, name: 'Fixed-wing aircraft, airplane', weight: 0.7 },
  { index: 337, name: 'Engine', weight: 0.6 },
  { index: 125, name: 'Buzz', weight: 0.4 },
] as const;

/**
 * Порог drone-score по умолчанию. YAMNet отдаёт сигмоидные multi-label score,
 * типичные уверенные значения — 0.2–0.6. Стартовое значение до калибровки ND3.
 */
export const DEFAULT_DRONE_SCORE_THRESHOLD = 0.25;
