/**
 * Типы для @membrana/audio-engine-service.
 * Никаких зависимостей кроме TypeScript.
 */

/**
 * Кадр аудио-данных, который engine отдаёт потребителям (FFT, нейросетям, LLM).
 * Это сырые сэмплы во времени; конкретный анализатор сам решает, что с ними делать.
 */
export interface AudioSampleFrame {
  /** Сэмплы из текущего кадра (моно, временная область). */
  readonly samples: Float32Array;
  /** Sample rate в Гц. */
  readonly sampleRate: number;
  /** Метка времени Date.now() в момент захвата. */
  readonly timestamp: number;
}

/** Колбэк получателя кадров. */
export type SampleFrameHandler = (frame: AudioSampleFrame) => void;

/** Конфигурация захвата с live-источника (микрофон / MediaStream). */
export interface LiveCaptureConfig {
  /** Размер окна выборки (степень двойки). По умолчанию 2048. */
  readonly bufferSize: number;
  /**
   * Сглаживание AnalyserNode (для частотного режима). При выборке временных
   * данных параметр практически не влияет, но мы пробрасываем его на случай,
   * если потребитель хочет дополнительно читать частотную область.
   */
  readonly smoothingTimeConstant: number;
}

export const DEFAULT_LIVE_CAPTURE_CONFIG: LiveCaptureConfig = {
  bufferSize: 2048,
  smoothingTimeConstant: 0.8,
};

/** Состояние LiveSampler'а. */
export type LiveSamplerState = 'idle' | 'starting' | 'running' | 'stopped' | 'error';
