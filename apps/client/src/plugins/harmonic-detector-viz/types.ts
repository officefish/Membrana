import { DEFAULT_CONFIDENCE_THRESHOLD } from '@membrana/harmonic-detector-service';

import type { AnalysisSourceKind } from '../../lib/audioAnalysis';

export const HARMONIC_DETECTOR_VIZ_PLUGIN_ID = 'harmonic-detector-viz';

export const HARMONIC_DETECTOR_SOURCE_ID = 'harmonic-detector-viz';
export const HARMONIC_DETECTOR_SOURCE_LABEL = 'Гармонический детектор';

/**
 * Целевой nodeKind для device-board D1:
 * category: 'detector', inputs: AudioFrame, outputs: Detection
 */
export interface HarmonicDetectorVizPluginConfig {
  readonly confidenceThreshold: number;
  readonly analysisSource: AnalysisSourceKind;
}

export const defaultHarmonicDetectorVizConfig: HarmonicDetectorVizPluginConfig = {
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
  analysisSource: 'microphone',
};

export function resolveHarmonicDetectorVizConfig(
  raw: Partial<HarmonicDetectorVizPluginConfig> | undefined,
): HarmonicDetectorVizPluginConfig {
  const t = Number(raw?.confidenceThreshold ?? defaultHarmonicDetectorVizConfig.confidenceThreshold);
  return {
    confidenceThreshold: Number.isFinite(t) ? Math.min(0.95, Math.max(0.2, t)) : DEFAULT_CONFIDENCE_THRESHOLD,
    analysisSource:
      raw?.analysisSource === 'sample-library' || raw?.analysisSource === 'graph'
        ? raw.analysisSource
        : 'microphone',
  };
}

export function harmonicDroneSourceId(analysisSource: AnalysisSourceKind): string {
  return analysisSource === 'sample-library'
    ? `${HARMONIC_DETECTOR_SOURCE_ID}-sample`
    : HARMONIC_DETECTOR_SOURCE_ID;
}
