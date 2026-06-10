import type { PluginSidebarDetailsArgs } from '@membrana/agenda';
import {
  FFT_INDICES_VIZ_PLUGIN_ID,
  FftIndicesVizSidebarSettings,
} from './plugins/fft-indices-viz';
import {
  SOUND_QUALITY_VIZ_PLUGIN_ID,
  SoundQualityVizSidebarSettings,
} from './plugins/sound-quality-viz';
import {
  HARMONIC_DETECTOR_VIZ_PLUGIN_ID,
  HarmonicDetectorSidebarSettings,
} from './plugins/harmonic-detector-viz';
import {
  MIC_BUFFER_RECORDER_PLUGIN_ID,
  MicBufferRecorderSidebarSettings,
} from './plugins/mic-buffer-recorder';
import { MIC_STREAM_VIZ_PLUGIN_ID, StreamVizPluginWidgetRadios } from './plugins/microphone-stream-viz';

export function renderPluginSidebarDetails(args: PluginSidebarDetailsArgs) {
  if (args.pluginId === MIC_STREAM_VIZ_PLUGIN_ID) {
    return <StreamVizPluginWidgetRadios moduleId={args.moduleId} />;
  }
  if (args.pluginId === FFT_INDICES_VIZ_PLUGIN_ID) {
    return <FftIndicesVizSidebarSettings moduleId={args.moduleId} />;
  }
  if (args.pluginId === SOUND_QUALITY_VIZ_PLUGIN_ID) {
    return <SoundQualityVizSidebarSettings moduleId={args.moduleId} />;
  }
  if (args.pluginId === HARMONIC_DETECTOR_VIZ_PLUGIN_ID) {
    return <HarmonicDetectorSidebarSettings moduleId={args.moduleId} />;
  }
  if (args.pluginId === MIC_BUFFER_RECORDER_PLUGIN_ID) {
    return <MicBufferRecorderSidebarSettings moduleId={args.moduleId} />;
  }
  return null;
}
