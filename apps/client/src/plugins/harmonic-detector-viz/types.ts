import { DEFAULT_CONFIDENCE_THRESHOLD } from '@membrana/harmonic-detector-service';

export const HARMONIC_DETECTOR_VIZ_PLUGIN_ID = 'harmonic-detector-viz';

export const HARMONIC_DETECTOR_SOURCE_ID = 'harmonic-detector-viz';
export const HARMONIC_DETECTOR_SOURCE_LABEL = 'Гармонический детектор';

export interface HarmonicDetectorVizPluginConfig {
  readonly confidenceThreshold: number;
}

export const defaultHarmonicDetectorVizConfig: HarmonicDetectorVizPluginConfig = {
  confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD,
};

export function resolveHarmonicDetectorVizConfig(
  raw: Partial<HarmonicDetectorVizPluginConfig> | undefined,
): HarmonicDetectorVizPluginConfig {
  const t = Number(raw?.confidenceThreshold ?? defaultHarmonicDetectorVizConfig.confidenceThreshold);
  return {
    confidenceThreshold: Number.isFinite(t) ? Math.min(0.95, Math.max(0.2, t)) : DEFAULT_CONFIDENCE_THRESHOLD,
  };
}
