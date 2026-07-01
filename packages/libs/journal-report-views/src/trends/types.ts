import type { TrendsDetectionResult } from '@membrana/trends-detector-service';
import type { SoundClass } from '@membrana/core';

/**
 * Journal DTO contract for an FFT trends analyzer report (`trends-fft/v0.1`).
 *
 * Mirrors the structure produced by the `trends-fft-analyzer` plugin and persisted
 * in the live journal payload. Self-contained so both apps render the same shape.
 */
export interface TrendsFftReport {
  readonly reportId: string;
  readonly schema: 'trends-fft/v0.1';
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly intervalMs: number;
  readonly measurementsCount: number;
  readonly mode: 'auto' | 'manual';
  readonly class?: SoundClass;
  readonly isDrone?: boolean;
  readonly isClassified?: boolean;
  readonly detectedState: string;
  readonly detectedStateName: string;
  readonly detectedStateIcon: string;
  readonly confidence: number;
  readonly confidenceLevel: string;
  readonly isDetected: boolean;
  readonly scores: TrendsDetectionResult['scores'];
  readonly samples: ReadonlyArray<{
    readonly timestamp: number;
    readonly centroid: number;
    readonly flux: number;
    readonly rms: number;
  }>;
  readonly temporalFeatures: TrendsDetectionResult['temporalFeatures'];
}
