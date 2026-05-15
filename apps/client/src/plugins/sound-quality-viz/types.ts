import type { SoundQualityWeights } from '@membrana/fft-analyzer-service';

export const SOUND_QUALITY_VIZ_PLUGIN_ID = 'sound-quality-viz';

export interface SoundQualityVizPluginConfig {
  readonly rmsHistorySize: number;
  readonly loudnessRefMax: number;
  readonly weights?: SoundQualityWeights;
}

export const defaultSoundQualityVizConfig: SoundQualityVizPluginConfig = {
  rmsHistorySize: 100,
  loudnessRefMax: 0.35,
};

const RMS_HISTORY_MIN = 50;
const RMS_HISTORY_MAX = 200;

export function resolveSoundQualityVizConfig(
  raw: Partial<SoundQualityVizPluginConfig> | undefined,
): SoundQualityVizPluginConfig {
  const size = Number(raw?.rmsHistorySize ?? defaultSoundQualityVizConfig.rmsHistorySize);
  const ref = Number(raw?.loudnessRefMax ?? defaultSoundQualityVizConfig.loudnessRefMax);
  return {
    rmsHistorySize: Math.min(
      RMS_HISTORY_MAX,
      Math.max(RMS_HISTORY_MIN, Number.isFinite(size) ? Math.round(size) : 100),
    ),
    loudnessRefMax: Number.isFinite(ref) && ref > 0 ? ref : 0.35,
    weights: raw?.weights,
  };
}
