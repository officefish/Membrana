export const FFT_INDICES_VIZ_PLUGIN_ID = 'fft-indices-viz';

export type FftIndicesVizMode = 'radar' | 'bars' | 'triangle';

export interface FftIndicesVizPluginConfig {
  readonly vizMode: FftIndicesVizMode;
  readonly showDroneZone: boolean;
  /** EMA 0…0.95 — только отображение */
  readonly displaySmoothing: number;
}

export const defaultFftIndicesVizConfig: FftIndicesVizPluginConfig = {
  vizMode: 'bars',
  showDroneZone: true,
  displaySmoothing: 0.55,
};

export function resolveFftIndicesVizConfig(
  raw: Partial<FftIndicesVizPluginConfig> | undefined,
): FftIndicesVizPluginConfig {
  return {
    vizMode: raw?.vizMode ?? defaultFftIndicesVizConfig.vizMode,
    showDroneZone: raw?.showDroneZone ?? defaultFftIndicesVizConfig.showDroneZone,
    displaySmoothing:
      raw?.displaySmoothing ?? defaultFftIndicesVizConfig.displaySmoothing,
  };
}
