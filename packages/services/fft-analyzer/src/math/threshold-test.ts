/**
 * Пороговый FFT-тест: чистая математика без React / Web Audio.
 * См. docs/prompts/FFT_THRESHOLD_TEST_PLUGIN_PROMPT.md
 */

export type StrictnessLevel = 'easy' | 'normal' | 'strict';
export type ThresholdTestMode = 'manual' | 'auto';
export type ThresholdTestFrameCount = 3 | 5 | 7 | 10;

export const THRESHOLD_TEST_FRAME_COUNTS: readonly ThresholdTestFrameCount[] = [
  3, 5, 7, 10,
] as const;

export interface ThresholdBounds {
  readonly min: number;
  readonly max: number;
}

export interface ThresholdTestThresholds {
  readonly centroid: ThresholdBounds;
  readonly flux: ThresholdBounds;
  readonly rms: ThresholdBounds;
}

export interface FrameMetrics {
  readonly centroid: number;
  readonly flux: number;
  readonly rms: number;
}

export interface FrameVerdict {
  readonly index: number;
  readonly timestamp: number;
  readonly centroid: number;
  readonly flux: number;
  readonly rms: number;
  readonly centroidInRange: boolean;
  readonly fluxInRange: boolean;
  readonly rmsInRange: boolean;
  readonly metricsInRangeCount: number;
  readonly framePassed: boolean;
}

export interface ThresholdTestResult {
  readonly testId: string;
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly frameCount: ThresholdTestFrameCount;
  readonly strictness: StrictnessLevel;
  readonly thresholds: ThresholdTestThresholds;
  readonly intervalMs: number;
  readonly frames: readonly FrameVerdict[];
  readonly passedCount: number;
  readonly passRate: number;
  readonly isDetected: boolean;
  readonly mode: ThresholdTestMode;
}

function inRange(value: number, bounds: ThresholdBounds): boolean {
  return value >= bounds.min && value <= bounds.max;
}

function minMetricsInRangeForFrame(strictness: StrictnessLevel): number {
  switch (strictness) {
    case 'easy':
      return 1;
    case 'normal':
      return 2;
    case 'strict':
      return 3;
    default: {
      const _exhaustive: never = strictness;
      return _exhaustive;
    }
  }
}

export function minPassRateForStrictness(strictness: StrictnessLevel): number {
  switch (strictness) {
    case 'easy':
      return 0.3;
    case 'normal':
      return 0.6;
    case 'strict':
      return 0.9;
    default: {
      const _exhaustive: never = strictness;
      return _exhaustive;
    }
  }
}

/** Вердикт одного кадра (без index/timestamp — добавляет оркестратор). */
export function evaluateFrameVerdict(
  metrics: FrameMetrics,
  thresholds: ThresholdTestThresholds,
  strictness: StrictnessLevel,
): Omit<FrameVerdict, 'index' | 'timestamp'> {
  const centroidInRange = inRange(metrics.centroid, thresholds.centroid);
  const fluxInRange = inRange(metrics.flux, thresholds.flux);
  const rmsInRange = inRange(metrics.rms, thresholds.rms);
  const metricsInRangeCount =
    (centroidInRange ? 1 : 0) + (fluxInRange ? 1 : 0) + (rmsInRange ? 1 : 0);
  const framePassed =
    metricsInRangeCount >= minMetricsInRangeForFrame(strictness);

  return {
    centroid: metrics.centroid,
    flux: metrics.flux,
    rms: metrics.rms,
    centroidInRange,
    fluxInRange,
    rmsInRange,
    metricsInRangeCount,
    framePassed,
  };
}

export function isThresholdTestFrameCount(n: number): n is ThresholdTestFrameCount {
  return n === 3 || n === 5 || n === 7 || n === 10;
}

export function evaluateThresholdTest(params: {
  readonly frames: readonly FrameVerdict[];
  readonly strictness: StrictnessLevel;
  readonly frameCount: ThresholdTestFrameCount;
  readonly thresholds: ThresholdTestThresholds;
  readonly intervalMs: number;
  readonly mode: ThresholdTestMode;
  readonly testId: string;
  readonly startedAt: number;
  readonly finishedAt: number;
}): ThresholdTestResult {
  if (params.frames.length !== params.frameCount) {
    throw new Error(
      `evaluateThresholdTest: expected ${params.frameCount} frames, got ${params.frames.length}`,
    );
  }

  const passedCount = params.frames.filter((f) => f.framePassed).length;
  const passRate = passedCount / params.frameCount;
  const isDetected = passRate >= minPassRateForStrictness(params.strictness);

  return {
    testId: params.testId,
    startedAt: params.startedAt,
    finishedAt: params.finishedAt,
    frameCount: params.frameCount,
    strictness: params.strictness,
    thresholds: params.thresholds,
    intervalMs: params.intervalMs,
    frames: params.frames,
    passedCount,
    passRate,
    isDetected,
    mode: params.mode,
  };
}
