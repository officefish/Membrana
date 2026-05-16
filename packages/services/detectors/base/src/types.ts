import type { AudioSampleFrame } from '@membrana/audio-engine-service';

/** Окно аудио для инференса детектора (независимо от источника: live / файл). */
export interface AudioWindow {
  readonly samples: Float32Array;
  readonly sampleRate: number;
  /** Мс от начала потока (монотонная шкала потребителя). */
  readonly timestamp: number;
  readonly durationSec: number;
}

export type DetectorFamily = 'dsp' | 'neural' | 'agentic';

export interface DetectionResult {
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly reasoning?: string;
  /** Частоты несущих/гармоник (Гц), если детектор их оценил. */
  readonly fundamentalsHz?: readonly number[];
  readonly features?: Readonly<Record<string, number>>;
  readonly latencyMs: number;
}

export interface DroneDetector {
  readonly name: string;
  readonly family: DetectorFamily;
  detect(window: AudioWindow): Promise<DetectionResult>;
}

/** Собрать AudioWindow из кадра engine. */
export function audioWindowFromFrame(
  frame: AudioSampleFrame,
  streamOriginMs = 0,
): AudioWindow {
  const durationSec = frame.samples.length / frame.sampleRate;
  return {
    samples: frame.samples,
    sampleRate: frame.sampleRate,
    timestamp: frame.timestamp - streamOriginMs,
    durationSec,
  };
}
