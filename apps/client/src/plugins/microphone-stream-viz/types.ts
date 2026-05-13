export const MIC_STREAM_VIZ_PLUGIN_ID = 'microphone-stream-viz';

export interface MicStreamVizPluginConfig {
  showVolume: boolean;
  showQuality: boolean;
  showWaveform: boolean;
  showSpectrum: boolean;
  /** Столбиковый FFT на canvas, как в модуле FFT Анализатор */
  showFftBars: boolean;
  /** Кривая спектра (линейная визуализация уровней по частоте) */
  showSpectrumLine: boolean;
}

export const defaultMicStreamVizConfig: MicStreamVizPluginConfig = {
  showVolume: true,
  showQuality: true,
  showWaveform: true,
  showSpectrum: true,
  showFftBars: true,
  showSpectrumLine: true,
};

export function resolveMicStreamVizConfig(raw: unknown): MicStreamVizPluginConfig {
  if (!raw || typeof raw !== 'object') return { ...defaultMicStreamVizConfig };
  const o = raw as Record<string, unknown>;
  return {
    showVolume:
      typeof o.showVolume === 'boolean' ? o.showVolume : defaultMicStreamVizConfig.showVolume,
    showQuality:
      typeof o.showQuality === 'boolean' ? o.showQuality : defaultMicStreamVizConfig.showQuality,
    showWaveform:
      typeof o.showWaveform === 'boolean'
        ? o.showWaveform
        : defaultMicStreamVizConfig.showWaveform,
    showSpectrum:
      typeof o.showSpectrum === 'boolean'
        ? o.showSpectrum
        : defaultMicStreamVizConfig.showSpectrum,
    showFftBars:
      typeof o.showFftBars === 'boolean' ? o.showFftBars : defaultMicStreamVizConfig.showFftBars,
    showSpectrumLine:
      typeof o.showSpectrumLine === 'boolean'
        ? o.showSpectrumLine
        : defaultMicStreamVizConfig.showSpectrumLine,
  };
}
