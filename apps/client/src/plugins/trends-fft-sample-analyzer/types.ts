import {
  DEFAULT_ENABLED_TEMPLATE_KEYS,
  type TrendsFftAnalyzerPluginConfig,
} from '../trends-fft-analyzer/types';
import {
  INTERVAL_MS_MAX,
  INTERVAL_MS_MIN,
  MEASUREMENTS_MAX,
  MEASUREMENTS_MIN,
} from '../trends-fft-analyzer/measurementPresets';
import {
  isUserTemplateKey,
  SYSTEM_TEMPLATE_KEYS,
} from '@membrana/trends-detector-service';

import type { SampleDurationPlan } from './sampleDurationPolicy';

export const TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID = 'trends-fft-sample-analyzer';

export interface TrendsFftSampleAnalyzerPluginConfig {
  readonly intervalMs: number;
  readonly measurementsCount: number;
  readonly minRms: number;
  readonly minConfidence: number;
  readonly enabledTemplateKeys: readonly string[];
}

export const defaultTrendsFftSampleAnalyzerConfig: TrendsFftSampleAnalyzerPluginConfig = {
  intervalMs: 100,
  measurementsCount: 100,
  minRms: 0.02,
  minConfidence: 35,
  enabledTemplateKeys: DEFAULT_ENABLED_TEMPLATE_KEYS,
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
          (SYSTEM_TEMPLATE_KEYS as readonly string[]).includes(k) ||
          isUserTemplateKey(k),
      )
    : DEFAULT_ENABLED_TEMPLATE_KEYS;

  return {
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
      enabledTemplateKeys.length > 0 ? enabledTemplateKeys : DEFAULT_ENABLED_TEMPLATE_KEYS,
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
  readonly measurementsCount: number;
  readonly collectedCount: number;
  readonly tickStates: readonly ('pending' | 'collected')[];
  readonly currentSample: { readonly centroid: number; readonly flux: number; readonly rms: number } | null;
  readonly lastResult: import('@membrana/trends-detector-service').TrendsDetectionResult | null;
  readonly intervalMs: number;
  readonly minRms: number;
  readonly selectedSampleId: string | null;
  readonly selectedSampleTitle: string | null;
  readonly durationPlan: SampleDurationPlan | null;
  readonly blockedReason: string | null;
}
