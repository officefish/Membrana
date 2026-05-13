/**
 * Типы и контракты сервиса @membrana/audio-analyzer-service.
 * Этот файл не зависит ни от чего, кроме TypeScript.
 */

// ============= Конфигурация =============

/** Главная конфигурация анализатора. */
export interface AudioAnalyzerConfig {
  /** Размер БПФ. Степень двойки. По умолчанию 2048. */
  readonly fftSize: number;
  /** Сглаживание между кадрами [0..1). По умолчанию 0.8. */
  readonly smoothingTimeConstant: number;
  /** Пороги детекции. */
  readonly detectionThresholds: DetectionThresholds;
  /** Параметры live-режима (микрофон / MediaStream). */
  readonly liveMode: LiveModeConfig;
  /** Расширенный анализ (включаются дорогие метрики). */
  readonly advancedAnalysis: AdvancedAnalysisConfig;
}

/** Пороги детекции по метрикам. Кадр считается обнаруженным, если ВСЕ метрики в диапазоне. */
export interface DetectionThresholds {
  readonly centroidMin: number;
  readonly centroidMax: number;
  readonly fluxMin: number;
  readonly fluxMax: number;
  readonly rmsMin: number;
  readonly rmsMax: number;
}

/** Конфиг live-режима. */
export interface LiveModeConfig {
  /** Интервал между кадрами в мс (используется и в file-mode). По умолчанию 30. */
  readonly intervalMs: number;
  /** Минимальный RMS для регистрации активности. */
  readonly minRMS: number;
  /** Диапазон частот для анализа (фильтр). */
  readonly frequencyRange: FrequencyRange;
}

export interface FrequencyRange {
  readonly min: number;
  readonly max: number;
}

/** Опциональные тяжёлые метрики. */
export interface AdvancedAnalysisConfig {
  readonly enabled: boolean;
  readonly calculateSpectrum: boolean;
  readonly calculateStatistics: boolean;
  readonly calculateTemporalPatterns: boolean;
}

// ============= Результаты =============

/** Результат одного кадра (live или внутри file-режима). */
export interface LiveFrameResult {
  /** Метка времени, мс с Unix epoch для live, или секунды от начала файла для file. */
  readonly timestamp: number;
  /** Спектральный центроид, Гц. */
  readonly centroid: number;
  /** Спектральный flux (изменение спектра между кадрами). */
  readonly flux: number;
  /** RMS амплитуда. */
  readonly rms: number;
  /** Детектирован ли кадр (все метрики в пороге). */
  readonly isDetected: boolean;
  /** Сырая магнитуда спектра, если включено в advancedAnalysis. */
  readonly spectrum?: Float32Array;
  /** Процент энергии в нижней десятой полосы, если включено. */
  readonly lowEnergyPercent?: number;
  /** Оценка стабильности [0..1], если включено. */
  readonly stability?: number;
}

/** Результат анализа целого файла. */
export interface FileAnalysisResult {
  readonly duration: number;
  readonly sampleRate: number;
  readonly totalFrames: number;
  readonly frames: readonly LiveFrameResult[];
  readonly statistics?: AnalysisStatistics;
  readonly temporalPatterns?: CompleteTemporalPatterns;
}

/** Статистика по всем кадрам. */
export interface AnalysisStatistics {
  readonly centroid: MetricStats;
  readonly flux: MetricStats;
  readonly rms: MetricStats;
  /** Доля кадров, прошедших детектор [0..1]. */
  readonly detectionRate: number;
}

export interface MetricStats {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  readonly std: number;
}

/** Структурные временные паттерны. Реализуется поэтапно — см. TODO в коде. */
export interface CompleteTemporalPatterns {
  readonly centroidStd: number;
  readonly fluxStd: number;
  readonly rmsStd: number;
  readonly activityRatio: number;
  readonly avgSilenceDuration: number;
  readonly avgBurstDuration: number;
  readonly volumeTrend: TrendType;
  readonly frequencyTrend: TrendType;
  readonly longTermStability: StabilityLevel;
  readonly stabilityScore: number;
  readonly periodicity: PeriodicityType;
  readonly periodicityStrength: number;
  readonly envelopeShape: EnvelopeShape;
  readonly attackTime: number;
  readonly decayTime: number;
  readonly peakToAverageRatio: number;
  readonly zeroCrossingRate: number;
  readonly spectralRolloff: number;
  readonly spectralFlatness: number;
}

export type TrendType =
  | 'stable'
  | 'increasing'
  | 'decreasing'
  | 'oscillating'
  | 'modulated'
  | 'fluctuating';

export type StabilityLevel =
  | 'veryLow'
  | 'low'
  | 'medium'
  | 'high'
  | 'veryHigh';

export type PeriodicityType = 'none' | 'irregular' | 'semiRegular' | 'regular';

export type EnvelopeShape =
  | 'impulsive'
  | 'attackDecay'
  | 'sustained'
  | 'pluck'
  | 'complex';

// ============= События =============

export type AnalysisEvent = 'start' | 'stop' | 'frame' | 'error';

export interface AnalysisEventMap {
  start: void;
  stop: void;
  frame: LiveFrameResult;
  error: Error;
}

export type AnalysisListener<E extends AnalysisEvent> = (
  payload: AnalysisEventMap[E],
) => void;
