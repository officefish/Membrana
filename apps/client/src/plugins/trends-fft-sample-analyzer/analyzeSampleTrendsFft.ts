import { getMonoChannel } from '@membrana/audio-engine-service';
import {
  collectMetricSamples,
  DEFAULT_FFT_SIZE,
} from '@membrana/template-match-detector-service';
import { classifyTrends, type TrendsDetectionResult } from '@membrana/trends-detector-service';
import { loadSampleBufferById } from '@membrana/sample-playback-service';

import {
  DRONE_TIGHT_MIN_CONFIDENCE,
  DRONE_TIGHT_TRENDS_INTERVAL_MS,
  DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  getFreeV1ClassifyOptions,
  resolveTrendsTemplatesForAnalysis,
} from '../../lib/droneTightCalibration';
import { buildTrendsFftReport, type TrendsFftReport } from '../trends-fft-analyzer/buildTrendsFftReport';
import { userTemplatesStore } from '../trends-fft-analyzer/userTemplatesStore';

import type { TrendsFftSampleAnalyzerPluginConfig } from './types';

function newReportId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `trends-sample-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface AnalyzeSampleTrendsFftResult {
  readonly report: TrendsFftReport;
  readonly result: TrendsDetectionResult;
}

/**
 * Offline-прогон trends-fft по сэмплу библиотеки (паритет с benchmark-харнессом:
 * collectMetricSamples 10×500 мс + classifyTrends с DRONE_TIGHT + конкуренты).
 */
export async function analyzeSampleTrendsFft(
  sampleId: string,
  config: TrendsFftSampleAnalyzerPluginConfig,
): Promise<AnalyzeSampleTrendsFftResult> {
  const buffer = await loadSampleBufferById(sampleId);
  const samples = getMonoChannel(buffer);
  const sampleRate = buffer.sampleRate;
  const startedAt = Date.now();

  const intervalMs = config.intervalMs;
  const measurementsCount = config.measurementsCount;

  const metricSamples = collectMetricSamples(samples, sampleRate, {
    fftSize: DEFAULT_FFT_SIZE,
    intervalMs,
    measurementsCount,
  });

  const templates = resolveTrendsTemplatesForAnalysis(
    userTemplatesStore.getTemplates(),
    config.enabledTemplateKeys,
  );
  const result = classifyTrends(metricSamples, templates, {
    ...getFreeV1ClassifyOptions(config.minConfidence),
    activityRmsThreshold: config.minRms,
  });

  return {
    report: buildTrendsFftReport({
      reportId: newReportId(),
      startedAt,
      finishedAt: Date.now(),
      intervalMs,
      measurementsCount,
      mode: 'manual',
      result,
    }),
    result,
  };
}

/** Дефолты харнесса (для тестов и сравнения). */
export const HARNESS_TRENDS_DEFAULTS = {
  intervalMs: DRONE_TIGHT_TRENDS_INTERVAL_MS,
  measurementsCount: DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  minConfidence: DRONE_TIGHT_MIN_CONFIDENCE,
  minRms: 0.02,
} as const;
