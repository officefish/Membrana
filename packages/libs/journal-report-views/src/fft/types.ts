import type {
  StrictnessLevel,
  ThresholdTestMode,
  ThresholdTestThresholds,
} from '@membrana/fft-analyzer-service';

/**
 * Journal DTO contract for an FFT threshold test report (`fft-threshold-test/v0.2`).
 *
 * Mirrors the structure produced by the `fft-threshold-test` plugin and persisted
 * in the live journal payload. Kept self-contained here so both `apps/client` and
 * `apps/cabinet` render the same shape without importing app-internal plugin code.
 */
export interface FftThresholdFrameReportRow {
  readonly index: number;
  readonly timestamp: number;
  readonly centroidHz: number;
  readonly centroidNorm: number;
  readonly fluxRaw: number;
  readonly fluxNorm: number;
  readonly rmsRaw: number;
  readonly rmsNorm: number;
  readonly centroidInRange: boolean;
  readonly fluxInRange: boolean;
  readonly rmsInRange: boolean;
  readonly framePassed: boolean;
}

export interface FftThresholdTestReport {
  readonly testId: string;
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly isDetected: boolean;
  readonly passedCount: number;
  readonly passRate: number;
  readonly frameCount: number;
  readonly strictness: StrictnessLevel;
  readonly mode: ThresholdTestMode;
  readonly intervalMs: number;
  readonly thresholds: ThresholdTestThresholds;
  readonly normalization: {
    readonly centroidHzMax: number;
    readonly fluxRefMax: number;
    readonly loudnessRefMax: number;
  };
  readonly frames: readonly FftThresholdFrameReportRow[];
}

export const STRICTNESS_LABELS: Record<StrictnessLevel, string> = {
  easy: 'Лёгкий',
  normal: 'Средний',
  strict: 'Строгий',
};
