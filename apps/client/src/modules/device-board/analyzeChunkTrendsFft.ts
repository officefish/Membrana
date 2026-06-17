import { rms } from '@membrana/fft-analyzer-service';
import {
  collectMetricSamples,
  DEFAULT_FFT_SIZE,
} from '@membrana/template-match-detector-service';
import { classifyTrends, type TrendsDetectionResult } from '@membrana/trends-detector-service';

import {
  DRONE_TIGHT_MIN_CONFIDENCE,
  DRONE_TIGHT_TRENDS_INTERVAL_MS,
  DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  getDroneTightEnabledTemplateKeys,
  resolveTrendsTemplatesForAnalysis,
} from '@/lib/droneTightCalibration';
import { userTemplatesStore } from '@/plugins/trends-fft-analyzer/userTemplatesStore';

export interface AnalyzeChunkTrendsFftResult {
  readonly result: TrendsDetectionResult;
  readonly rawLevel: number;
}

/** Offline trends-FFT по PCM-чанку с микрофона (паритет с sample analyzer / DRONE_TIGHT). */
export function analyzeChunkTrendsFft(
  samples: Float32Array,
  sampleRate: number,
): AnalyzeChunkTrendsFftResult {
  const metricSamples = collectMetricSamples(samples, sampleRate, {
    fftSize: DEFAULT_FFT_SIZE,
    intervalMs: DRONE_TIGHT_TRENDS_INTERVAL_MS,
    measurementsCount: DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  });

  const templates = resolveTrendsTemplatesForAnalysis(
    userTemplatesStore.getTemplates(),
    [...getDroneTightEnabledTemplateKeys()],
  );

  const result = classifyTrends(metricSamples, templates, {
    minConfidence: DRONE_TIGHT_MIN_CONFIDENCE,
    activityRmsThreshold: 0.02,
  });

  return {
    result,
    rawLevel: rms(samples),
  };
}
