import type { TrendsDetectionResult } from '@membrana/trends-detector-service';

import type { TrendsFftReport } from '../trends-fft-analyzer/buildTrendsFftReport';
import {
  type TrendsFftAnalyzerPluginConfig,
} from '../trends-fft-analyzer/types';
import {
  INTERVAL_MS_MAX,
  INTERVAL_MS_MIN,
  MEASUREMENTS_MAX,
  MEASUREMENTS_MIN,
} from '../trends-fft-analyzer/measurementPresets';
import {
  DRONE_TIGHT_MIN_CONFIDENCE,
  DRONE_TIGHT_TRENDS_INTERVAL_MS,
  DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  getDroneTightEnabledTemplateKeys,
} from '../../lib/droneTightCalibration';
import { isUserTemplateKey } from '@membrana/trends-detector-service';

import type { SampleDurationPlan } from './sampleDurationPolicy';

export const TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID = 'trends-fft-sample-analyzer';

export type TrendsFftSampleAnalysisStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TrendsFftSampleAnalyzerPluginConfig {
  readonly autoAnalyzeOnEnd: boolean;
  readonly intervalMs: number;
  readonly measurementsCount: number;
  readonly minRms: number;
  readonly minConfidence: number;
  readonly enabledTemplateKeys: readonly string[];
}

export const defaultTrendsFftSampleAnalyzerConfig: TrendsFftSampleAnalyzerPluginConfig = {
  autoAnalyzeOnEnd: true,
  intervalMs: DRONE_TIGHT_TRENDS_INTERVAL_MS,
  measurementsCount: DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
  minRms: 0.02,
  minConfidence: DRONE_TIGHT_MIN_CONFIDENCE,
  enabledTemplateKeys: getDroneTightEnabledTemplateKeys(),
};

export function resolveTrendsFftSampleAnalyzerConfig(
  raw: Partial<TrendsFftSampleAnalyzerPluginConfig> | undefined,
): TrendsFftSampleAnalyzerPluginConfig {
  const intervalMs = Number(raw?.intervalMs ?? defaultTrendsFftSampleAnalyzerConfig.intervalMs);
  const measurementsCount = Number(
    raw?.measurementsCount ?? defaultTrendsFftSampleAnalyzerConfig.measurementsCount,
  );
  const minRms = Number(raw?.minRms ?? defaultTrendsFftSampleAnalyzerConfig.minRms);
  const minConfidence = Number(
    raw?.minConfidence ?? defaultTrendsFftSampleAnalyzerConfig.minConfidence,
  );

  const enabledTemplateKeys = Array.isArray(raw?.enabledTemplateKeys)
    ? raw.enabledTemplateKeys.filter(
        (k) =>
          getDroneTightEnabledTemplateKeys().includes(k) ||
          isUserTemplateKey(k),
      )
    : getDroneTightEnabledTemplateKeys();

  return {
    autoAnalyzeOnEnd:
      typeof raw?.autoAnalyzeOnEnd === 'boolean'
        ? raw.autoAnalyzeOnEnd
        : defaultTrendsFftSampleAnalyzerConfig.autoAnalyzeOnEnd,
    intervalMs: Number.isFinite(intervalMs)
      ? Math.min(INTERVAL_MS_MAX, Math.max(INTERVAL_MS_MIN, Math.round(intervalMs)))
      : defaultTrendsFftSampleAnalyzerConfig.intervalMs,
    measurementsCount: Number.isFinite(measurementsCount)
      ? Math.min(MEASUREMENTS_MAX, Math.max(MEASUREMENTS_MIN, Math.round(measurementsCount)))
      : defaultTrendsFftSampleAnalyzerConfig.measurementsCount,
    minRms: Number.isFinite(minRms)
      ? Math.min(1, Math.max(0, minRms))
      : defaultTrendsFftSampleAnalyzerConfig.minRms,
    minConfidence: Number.isFinite(minConfidence)
      ? Math.min(100, Math.max(0, Math.round(minConfidence)))
      : defaultTrendsFftSampleAnalyzerConfig.minConfidence,
    enabledTemplateKeys:
      enabledTemplateKeys.length > 0
        ? enabledTemplateKeys
        : defaultTrendsFftSampleAnalyzerConfig.enabledTemplateKeys,
  };
}

/** Совместимость с общими компонентами trends-fft UI. */
export function toSharedTrendsConfig(
  config: TrendsFftSampleAnalyzerPluginConfig,
): TrendsFftAnalyzerPluginConfig {
  return {
    ...config,
    detectionMode: 'manual',
    autoRestartDelayMs: 0,
    analysisSource: 'sample-library',
  };
}

export interface TrendsFftSampleSnapshot {
  readonly ready: boolean;
  readonly phase: 'idle' | 'collecting' | 'result';
  readonly analysisStatus: TrendsFftSampleAnalysisStatus;
  readonly measurementsCount: number;
  readonly collectedCount: number;
  readonly tickStates: readonly ('pending' | 'collected')[];
  readonly currentSample: { readonly centroid: number; readonly flux: number; readonly rms: number } | null;
  readonly lastResult: TrendsDetectionResult | null;
  readonly lastReport: TrendsFftReport | null;
  readonly analyzedSampleId: string | null;
  readonly errorMessage: string | null;
  readonly intervalMs: number;
  readonly minRms: number;
  readonly selectedSampleId: string | null;
  readonly selectedSampleTitle: string | null;
  readonly durationPlan: SampleDurationPlan | null;
  readonly blockedReason: string | null;
}
