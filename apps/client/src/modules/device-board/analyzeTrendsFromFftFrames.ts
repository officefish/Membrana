import type { MetricSample, PatternTemplate, TrendsDetectionResult } from '@membrana/trends-detector-service';
import { classifyTrends } from '@membrana/trends-detector-service';
import { DEFAULT_FFT_TRENDS_POLICY, type ScenarioFftTrendsPolicy } from '@membrana/core';

import {
  getFreeV1ClassifyOptions,
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

function parseTimestampMs(iso: string, fallbackIndex: number): number {
  const parsed = Date.parse(iso);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return fallbackIndex * 100;
}

/**
 * Выбирает measurementsCount кадров с шагом intervalMs (parity с plugin setInterval).
 * Окно заканчивается на последнем кадре batch; для каждого слота — ближайший неиспользованный кадр.
 */
export function subsampleFftFramesForTrendsPolicy(
  frames: readonly FftFrameTrendInput[],
  policy: ScenarioFftTrendsPolicy,
): readonly FftFrameTrendInput[] {
  if (frames.length === 0) {
    return [];
  }

  const indexed = frames.map((frame, index) => ({
    frame,
    timestampMs: parseTimestampMs(frame.computedAtIso, index),
  }));
  indexed.sort((a, b) => a.timestampMs - b.timestampMs);

  const lastTs = indexed[indexed.length - 1]!.timestampMs;
  const windowMs = (policy.measurementsCount - 1) * policy.intervalMs;
  const scheduleStart = lastTs - windowMs;

  const used = new Set<number>();
  const selected: FftFrameTrendInput[] = [];

  for (let slot = 0; slot < policy.measurementsCount; slot++) {
    const targetMs = scheduleStart + slot * policy.intervalMs;
    let bestIdx = -1;
    let bestDelta = Number.POSITIVE_INFINITY;
    for (let i = 0; i < indexed.length; i++) {
      if (used.has(i)) {
        continue;
      }
      const delta = Math.abs(indexed[i]!.timestampMs - targetMs);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      used.add(bestIdx);
      selected.push(indexed[bestIdx]!.frame);
    }
  }

  return selected;
}

export interface AnalyzeTrendsFromFftFramesOptions {
  readonly policy?: ScenarioFftTrendsPolicy;
  readonly resolveTemplates?: (enabledKeys: readonly string[]) => PatternTemplate[];
}

export interface AnalyzeTrendsFromFftFramesResult {
  readonly result: TrendsDetectionResult;
  readonly rawLevel: number;
  readonly metricSampleCount: number;
  readonly policy: ScenarioFftTrendsPolicy;
}

/** Trends-FFT по FFT-кадрам с policy parity (classifyTrends + subsample по intervalMs). */
export function analyzeTrendsFromFftFrames(
  frames: readonly FftFrameTrendInput[],
  options: AnalyzeTrendsFromFftFramesOptions = {},
): AnalyzeTrendsFromFftFramesResult | null {
  if (frames.length === 0) {
    return null;
  }

  const policy = options.policy ?? DEFAULT_FFT_TRENDS_POLICY;
  const subsampled = subsampleFftFramesForTrendsPolicy(frames, policy);
  if (subsampled.length < policy.measurementsCount) {
    return null;
  }

  const metricSamples: MetricSample[] = subsampled.map((frame, index) => ({
    timestamp: parseTimestampMs(frame.computedAtIso, index),
    centroid: frame.spectralCentroidHz,
    flux: frame.flux,
    rms: frame.rms,
  }));

  const templates =
    options.resolveTemplates?.(policy.enabledTemplateKeys) ??
    resolveTrendsTemplatesForAnalysis(userTemplatesStore.getTemplates(), policy.enabledTemplateKeys);

  const result = classifyTrends(metricSamples, templates, {
    ...getFreeV1ClassifyOptions(policy.minConfidence),
    activityRmsThreshold: policy.minRms,
  });

  const rawLevel =
    metricSamples.length > 0
      ? metricSamples.reduce((sum, sample) => sum + sample.rms, 0) / metricSamples.length
      : 0;

  return {
    result,
    rawLevel,
    metricSampleCount: metricSamples.length,
    policy,
  };
}
