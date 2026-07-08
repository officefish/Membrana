/**
 * Слияние сырых confidence разнородных детекторов (combined UC, магистраль S2).
 *
 * ND3: профили ошибок DSP (trends) и нейро (yamnet) слабо коррелированы —
 * поэтому сливаем на СЫРОМ confidence, а НЕ бинарным OR по вердиктам. Бинарный
 * OR (`some(isDrone)`) выстреливает на любом одиночном сильном детекторе и
 * теряет весь смысл combined UC; взвешенное среднее — честный консенсус
 * модальностей: согласие high→high и low→low, расхождение → середина.
 *
 * Функция ЧИСТАЯ и ПОЛНАЯ (тотальная): без побочных эффектов, без исключений,
 * без зависимостей от фреймворков или реестра детекторов. `agreement`
 * выносится ОТДЕЛЬНЫМ полем — политика порога/тревоги остаётся у потребителя
 * (плагина «Микрофона»), ядро не принимает продуктовых решений.
 */

/** Один источник для слияния — снимок вердикта детектора по окну/треку. */
export interface FusionSourceInput {
  /** Стабильный идентификатор детектора, например 'trends' или 'yamnet'. */
  readonly name: string;
  /**
   * Семейство детектора ('dsp' | 'neural' | 'agentic' — из `@membrana/detector-base`).
   * Здесь это свободная метка `string`: ядро НЕ связывается с реестром детекторов,
   * чтобы не инвертировать зависимость core → service. Потребитель подставляет
   * `detector.family`.
   */
  readonly family: string;
  /** Сырой confidence детектора в [0..1]. НЕ бинарный вердикт. Клампится в диапазон. */
  readonly confidence: number;
  /** Собственный порог-вердикт детектора (переносится в perSource как есть). */
  readonly isDrone: boolean;
  /**
   * Вес источника в слиянии. По умолчанию 1 — равный голос. Позволяет отдать
   * нейро больший вес как основному hard-gate. Отрицательный/NaN трактуется как 0.
   */
  readonly weight?: number;
  /**
   * Источник «молчит» — детектор не отработал по этому окну (нет модели, окно
   * пропущено). Молчащие НЕ участвуют в combinedScore и agreement, но попадают
   * в perSource с normalizedWeight = 0. По умолчанию true (присутствует).
   */
  readonly present?: boolean;
}

/** Разложение вклада одного источника после слияния. */
export interface FusionPerSource {
  readonly name: string;
  readonly family: string;
  /** Confidence после клампа в [0..1]. */
  readonly confidence: number;
  readonly isDrone: boolean;
  /** Эффективный вес (>= 0) после нормализации входа. */
  readonly weight: number;
  readonly present: boolean;
  /** Нормированный вклад в combinedScore. Σ = 1 по присутствующим (0 у молчащих). */
  readonly normalizedWeight: number;
}

/** Результат слияния сырых confidence нескольких детекторов. */
export interface DetectionFusionResult {
  /**
   * Взвешенное среднее сырых confidence присутствующих источников, [0..1].
   * Нет присутствующих источников → 0.
   */
  readonly combinedScore: number;
  /**
   * Согласованность присутствующих источников, [0..1]: 1 — confidence совпадают,
   * 0 — максимальный разброс (range = max − min). Для <2 присутствующих = 1
   * (расхождению неоткуда взяться). Отдельно от combinedScore — политика тревоги
   * у потребителя.
   */
  readonly agreement: number;
  /** Число присутствующих (отработавших) источников. 0 → сигнала нет. */
  readonly presentCount: number;
  /** Разложение по каждому переданному источнику (в исходном порядке). */
  readonly perSource: readonly FusionPerSource[];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function normalizeWeight(weight: number | undefined): number {
  if (weight === undefined) return 1;
  if (!Number.isFinite(weight) || weight < 0) return 0;
  return weight;
}

/**
 * Слить сырые confidence разнородных детекторов во взвешенное среднее.
 *
 * @param sources источники (детекторы) с их сырым confidence; порядок сохраняется.
 * @returns combinedScore (взвешенное среднее), agreement (1 − range) и разложение.
 */
export function fuseDetectorConfidences(
  sources: readonly FusionSourceInput[],
): DetectionFusionResult {
  // Первый проход: нормализуем вход и выделяем присутствующие источники.
  const prepared = sources.map((source) => {
    const present = source.present !== false;
    const confidence = clamp01(source.confidence);
    // Молчащий источник не может нести вес в среднем, даже если weight задан.
    const weight = present ? normalizeWeight(source.weight) : 0;
    return { source, present, confidence, weight };
  });

  const totalWeight = prepared.reduce((sum, item) => sum + item.weight, 0);
  const presentConfidences = prepared
    .filter((item) => item.present)
    .map((item) => item.confidence);
  const presentCount = presentConfidences.length;

  // Взвешенное среднее по присутствующим источникам с ненулевым весом.
  // totalWeight === 0 (нет присутствующих или все веса нулевые) → combinedScore 0.
  const combinedScore =
    totalWeight > 0
      ? prepared.reduce((sum, item) => sum + item.weight * item.confidence, 0) / totalWeight
      : 0;

  // agreement = 1 − range по присутствующим confidence. <2 присутствующих → 1.
  const agreement =
    presentCount >= 2
      ? 1 - (Math.max(...presentConfidences) - Math.min(...presentConfidences))
      : 1;

  const perSource: FusionPerSource[] = prepared.map((item) => ({
    name: item.source.name,
    family: item.source.family,
    confidence: item.confidence,
    isDrone: item.source.isDrone,
    weight: item.weight,
    present: item.present,
    normalizedWeight: totalWeight > 0 ? item.weight / totalWeight : 0,
  }));

  return { combinedScore, agreement, presentCount, perSource };
}
