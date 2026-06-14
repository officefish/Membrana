import type {
  FrameVerdict,
  StrictnessLevel,
  ThresholdTestMode,
  ThresholdTestResult,
  ThresholdTestThresholds,
} from '@membrana/fft-analyzer-service';

import {
  METRIC_NORM,
  normalizeCentroidHz,
  normalizeFlux,
  normalizeLoudness,
} from './normalizeMetrics';

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

function frameToRow(frame: FrameVerdict): FftThresholdFrameReportRow {
  return {
    index: frame.index,
    timestamp: frame.timestamp,
    centroidHz: frame.centroid,
    centroidNorm: normalizeCentroidHz(frame.centroid),
    fluxRaw: frame.flux,
    fluxNorm: normalizeFlux(frame.flux),
    rmsRaw: frame.rms,
    rmsNorm: normalizeLoudness(frame.rms),
    centroidInRange: frame.centroidInRange,
    fluxInRange: frame.fluxInRange,
    rmsInRange: frame.rmsInRange,
    framePassed: frame.framePassed,
  };
}

export function buildFftThresholdTestReport(
  result: ThresholdTestResult,
): FftThresholdTestReport {
  return {
    testId: result.testId,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    isDetected: result.isDetected,
    passedCount: result.passedCount,
    passRate: result.passRate,
    frameCount: result.frameCount,
    strictness: result.strictness,
    mode: result.mode,
    intervalMs: result.intervalMs,
    thresholds: result.thresholds,
    normalization: { ...METRIC_NORM },
    frames: result.frames.map(frameToRow),
  };
}
