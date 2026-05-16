import type { DetectionResult } from '@membrana/detector-base';

/** Конфиг классификатора (фаза 1, #45). */
export interface HarmonicDetectorConfig {
  readonly fftSize: number;
  readonly sampleRate: number;
  readonly confidenceThreshold: number;
  readonly fundamentalMinHz: number;
  readonly fundamentalMaxHz: number;
  readonly harmonicMaxHz: number;
}

/** Результат math-слоя (совместим с ADR v0.1). */
export interface HarmonicSpectrumResult {
  readonly isDrone: boolean;
  readonly confidence: number;
  readonly reasoning: string;
  readonly fundamentals?: readonly number[];
}

export type { DetectionResult };
