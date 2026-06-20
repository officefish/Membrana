import type { MetricSample, TrendsDetectionResult } from '@membrana/trends-detector-service';
import { classifyTrends } from '@membrana/trends-detector-service';

import {
  DRONE_TIGHT_MIN_CONFIDENCE,
  getDroneTightEnabledTemplateKeys,
  resolveTrendsTemplatesForAnalysis,
} from '@/lib/droneTightCalibration';
import { userTemplatesStore } from '@/plugins/trends-fft-analyzer/userTemplatesStore';

/** Минимум метаданных FFT-кадра для trends без PCM round-trip. */
export interface FftFrameTrendInput {
  readonly computedAtIso: string;
  readonly spectralCentroidHz: number;
  readonly flux: number;
  readonly rms: number;
}

export interface AnalyzeTrendsFromFftFramesResult {
  readonly result: TrendsDetectionResult;
  readonly rawLevel: number;
  readonly metricSampleCount: number;
}

function parseTimestampMs(iso: string, fallbackIndex: number): number {
  const parsed = Date.parse(iso);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallbackIndex * 100;
}

/** Trends-FFT по последовательности FFT-кадров (паритет classifyTrends, без collectMetricSamples). */
export function analyzeTrendsFromFftFrames(
  frames: readonly FftFrameTrendInput[],
): AnalyzeTrendsFromFftFramesResult | null {
  if (frames.length === 0) {
    return null;
  }

  const metricSamples: MetricSample[] = frames.map((frame, index) => ({
    timestamp: parseTimestampMs(frame.computedAtIso, index),
    centroid: frame.spectralCentroidHz,
    flux: frame.flux,
    rms: frame.rms,
  }));

  const templates = resolveTrendsTemplatesForAnalysis(
    userTemplatesStore.getTemplates(),
    [...getDroneTightEnabledTemplateKeys()],
  );

  const result = classifyTrends(metricSamples, templates, {
    minConfidence: DRONE_TIGHT_MIN_CONFIDENCE,
    activityRmsThreshold: 0.02,
  });

  const rawLevel =
    metricSamples.length > 0
      ? metricSamples.reduce((sum, sample) => sum + sample.rms, 0) / metricSamples.length
      : 0;

  return {
    result,
    rawLevel,
    metricSampleCount: metricSamples.length,
  };
}
