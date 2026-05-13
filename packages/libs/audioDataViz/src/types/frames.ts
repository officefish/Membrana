/**
 * Снимки данных для визуализации: живой поток, офлайн-анализ или предрасчёт.
 * Компоненты библиотеки принимают «плоские» массивы; эти типы — для контрактов
 * пайплайнов (STFT, метрики по окну и т.д.).
 */

/** Временная область: отсчёты вдоль одного кадра (например float PCM или [-1,1]). */
export interface TimeDomainFrame {
  readonly kind: 'time';
  readonly samples: ReadonlyArray<number> | Float32Array;
  /** Частота дискретизации источника, Гц */
  sampleRateHz?: number;
  /** Время начала кадра в шкале источника, мс */
  tStartMs?: number;
}

/**
 * Частотная область в стиле AnalyserNode.getByteFrequencyData: 0…255 на бин.
 * Длина массива = число частотных бинов кадра.
 */
export interface FrequencyFrame {
  readonly kind: 'frequency';
  readonly magnitudes: Uint8Array;
  sampleRateHz?: number;
  tStartMs?: number;
}

/** Объединение кадров для общих API последовательностей и плееров. */
export type AudioVisualizationFrame = TimeDomainFrame | FrequencyFrame;
