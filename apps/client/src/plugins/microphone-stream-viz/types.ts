export const MIC_STREAM_VIZ_PLUGIN_ID = 'microphone-stream-viz';

export interface MicStreamVizPluginConfig {
  showVolume: boolean;
  showQuality: boolean;
  showWaveform: boolean;
  showSpectrum: boolean;
}

export const defaultMicStreamVizConfig: MicStreamVizPluginConfig = {
  showVolume: true,
  showQuality: true,
  showWaveform: true,
  showSpectrum: true,
};
