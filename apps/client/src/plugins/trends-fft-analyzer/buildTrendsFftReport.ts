import type { TrendsDetectionResult } from '@membrana/trends-detector-service';

export interface TrendsFftReport {
  readonly reportId: string;
  readonly schema: 'trends-fft/v0.1';
  readonly startedAt: number;
  readonly finishedAt: number;
  readonly intervalMs: number;
  readonly measurementsCount: number;
  readonly mode: 'auto' | 'manual';
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

export function buildTrendsFftReport(params: {
  reportId: string;
  startedAt: number;
  finishedAt: number;
  intervalMs: number;
  measurementsCount: number;
  mode: 'auto' | 'manual';
  result: TrendsDetectionResult;
}): TrendsFftReport {
  return {
    reportId: params.reportId,
    schema: 'trends-fft/v0.1',
    startedAt: params.startedAt,
    finishedAt: params.finishedAt,
    intervalMs: params.intervalMs,
    measurementsCount: params.measurementsCount,
    mode: params.mode,
    detectedState: params.result.detectedState,
    detectedStateName: params.result.detectedStateName,
    detectedStateIcon: params.result.detectedStateIcon,
    confidence: params.result.confidence,
    confidenceLevel: params.result.confidenceLevel,
    isDetected: params.result.isDetected,
    scores: params.result.scores,
    samples: params.result.samples.map((s) => ({
      timestamp: s.timestamp,
      centroid: s.centroid,
      flux: s.flux,
      rms: s.rms,
    })),
    temporalFeatures: params.result.temporalFeatures,
  };
}
