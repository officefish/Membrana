import {
  SYSTEM_TEMPLATE_KEYS,
  isUserTemplateKey,
  type PatternTemplate,
} from '@membrana/trends-detector-service';

import type { AnalysisSourceKind } from '../../lib/audioAnalysis';

import {
  INTERVAL_MS_MAX,
  INTERVAL_MS_MIN,
  MEASUREMENTS_MAX,
  MEASUREMENTS_MIN,
} from './measurementPresets';

export const TRENDS_FFT_ANALYZER_PLUGIN_ID = 'trends-fft-analyzer';

/**
 * Целевой nodeKind для device-board D1:
 * category: 'analyzer', deviceKinds: ['microphone']
 * inputs: [{ type: 'AudioFrame', handle: 'audio-in' }]
 * outputs: [{ type: 'Detection', handle: 'detection-out' }]
 *   kind = detected scene key, confidence, features = temporal summary
 */
export const TRENDS_FFT_NODE_KIND = {
  category: 'analyzer' as const,
  deviceKinds: ['microphone'] as const,
  inputs: [{ type: 'AudioFrame' as const, handle: 'audio-in' as const }],
  outputs: [{ type: 'Detection' as const, handle: 'detection-out' as const }],
};

export type TrendsDetectionMode = 'auto' | 'manual';

export interface TrendsFftAnalyzerPluginConfig {
  readonly intervalMs: number;
  readonly measurementsCount: number;
  readonly minRms: number;
  readonly detectionMode: TrendsDetectionMode;
  readonly autoRestartDelayMs: number;
  readonly minConfidence: number;
  readonly analysisSource: AnalysisSourceKind;
  readonly enabledTemplateKeys: readonly string[];
}

export const DEFAULT_ENABLED_TEMPLATE_KEYS: readonly string[] = [...SYSTEM_TEMPLATE_KEYS];

export const defaultTrendsFftAnalyzerConfig: TrendsFftAnalyzerPluginConfig = {
  intervalMs: 100,
  measurementsCount: 100,
  minRms: 0.02,
  detectionMode: 'auto',
  autoRestartDelayMs: 300,
  minConfidence: 35,
  analysisSource: 'microphone',
  enabledTemplateKeys: DEFAULT_ENABLED_TEMPLATE_KEYS,
};

export function resolveTrendsFftAnalyzerConfig(
  raw: Partial<TrendsFftAnalyzerPluginConfig> | undefined,
): TrendsFftAnalyzerPluginConfig {
  const intervalMs = Number(raw?.intervalMs ?? defaultTrendsFftAnalyzerConfig.intervalMs);
  const measurementsCount = Number(
    raw?.measurementsCount ?? defaultTrendsFftAnalyzerConfig.measurementsCount,
  );
  const minRms = Number(raw?.minRms ?? defaultTrendsFftAnalyzerConfig.minRms);
  const autoRestartDelayMs = Number(
    raw?.autoRestartDelayMs ?? defaultTrendsFftAnalyzerConfig.autoRestartDelayMs,
  );
  const minConfidence = Number(
    raw?.minConfidence ?? defaultTrendsFftAnalyzerConfig.minConfidence,
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
      : defaultTrendsFftAnalyzerConfig.intervalMs,
    measurementsCount: Number.isFinite(measurementsCount)
      ? Math.min(MEASUREMENTS_MAX, Math.max(MEASUREMENTS_MIN, Math.round(measurementsCount)))
      : defaultTrendsFftAnalyzerConfig.measurementsCount,
    minRms: Number.isFinite(minRms)
      ? Math.min(1, Math.max(0, minRms))
      : defaultTrendsFftAnalyzerConfig.minRms,
    detectionMode: raw?.detectionMode === 'manual' ? 'manual' : 'auto',
    autoRestartDelayMs: Number.isFinite(autoRestartDelayMs)
      ? Math.min(30_000, Math.max(500, Math.round(autoRestartDelayMs)))
      : defaultTrendsFftAnalyzerConfig.autoRestartDelayMs,
    minConfidence: Number.isFinite(minConfidence)
      ? Math.min(100, Math.max(0, Math.round(minConfidence)))
      : defaultTrendsFftAnalyzerConfig.minConfidence,
    analysisSource: 'microphone',
    enabledTemplateKeys:
      enabledTemplateKeys.length > 0 ? enabledTemplateKeys : DEFAULT_ENABLED_TEMPLATE_KEYS,
  };
}

export function templateLabel(template: PatternTemplate): string {
  return `${template.icon} ${template.name}`;
}
