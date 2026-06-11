import type { AudioSampleFrame } from '@membrana/audio-engine-service';

/** Источник кадров для анализаторов (микрофон, библиотека сэмплов, device-board). */
export type AnalysisSourceKind = 'microphone' | 'sample-library' | 'graph';

export type FrameHandler = (frame: AudioSampleFrame) => void;

/** Единый контракт подачи AudioSampleFrame в плагины-анализаторы. */
export interface AudioFrameFeed {
  readonly sourceKind: AnalysisSourceKind;
  subscribe(handler: FrameHandler): () => void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface FrameFeedCallbacks {
  readonly onStart?: () => void;
  readonly onStop?: () => void;
  readonly onError?: (error: Error) => void;
}

export interface BaseFrameFeedOptions extends FrameFeedCallbacks {
  readonly bufferSize: number;
  readonly smoothingTimeConstant?: number;
}

export interface MicFrameFeedOptions extends BaseFrameFeedOptions {
  readonly moduleId: string;
}

export interface BufferFrameFeedOptions extends BaseFrameFeedOptions {
  readonly buffer: AudioBuffer;
  /** Шаг между кадрами в сэмплах; по умолчанию = bufferSize. */
  readonly hopSize?: number;
  /** Интервал между эмитами кадров (мс) для имитации live; 0 — сразу все кадры. */
  readonly emitIntervalMs?: number;
  /** Шаг метки времени между кадрами (мс); по умолчанию — длительность hop. */
  readonly timestampStepMs?: number;
}

export interface SampleLibraryFrameFeedOptions extends BaseFrameFeedOptions {
  readonly hopSize?: number;
  readonly emitIntervalMs?: number;
  readonly timestampStepMs?: number;
}

export interface AnalysisFrameFeedOptions extends BaseFrameFeedOptions {
  readonly analysisSource: AnalysisSourceKind;
  readonly moduleId: string;
  readonly graphHandleId?: string;
  readonly hopSize?: number;
  readonly emitIntervalMs?: number;
  readonly timestampStepMs?: number;
}
