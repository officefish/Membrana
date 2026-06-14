import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import { LiveSampler, type AudioSampleFrame } from '@membrana/audio-engine-service';
import {
  FftAnalyzer,
  SpectralFluxTracker,
  applyPreset,
  PRESETS,
  frameLoudness,
} from '@membrana/fft-analyzer-service';

import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';

import { soundQualityVizPluginState } from './soundQualityVizPluginState';
import {
  SOUND_QUALITY_VIZ_PLUGIN_ID,
  defaultSoundQualityVizConfig,
  resolveSoundQualityVizConfig,
  type SoundQualityVizPluginConfig,
} from './types';

const FFT_SIZE = 2048;
const SMOOTHING = 0.5;

function readConfig(moduleId: string): SoundQualityVizPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, SOUND_QUALITY_VIZ_PLUGIN_ID)?.config;
  return resolveSoundQualityVizConfig(raw ?? defaultSoundQualityVizConfig);
}

export function createSoundQualityVizPlugin(): Plugin<SoundQualityVizPluginConfig> {
  return {
    id: SOUND_QUALITY_VIZ_PLUGIN_ID,
    name: 'Качество звука',
    description: 'Live-оценка пригодности потока для анализа (SNR, чёткость, динамика)',
    version: '1.0.0',
    active: false,
    config: { ...defaultSoundQualityVizConfig },
    install(context: ModuleContext<SoundQualityVizPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let currentSampler: LiveSampler | null = null;
      const fluxTracker = new SpectralFluxTracker();

      const analyzer = new FftAnalyzer(
        applyPreset({
          ...PRESETS.drone,
          fftSize: FFT_SIZE,
          smoothingTimeConstant: SMOOTHING,
          liveMode: {
            intervalMs: 100,
            frequencyRange: { min: 50, max: 4_000 },
          },
        }),
      );

      const stopSampler = (): Promise<void> => {
        const s = currentSampler;
        currentSampler = null;
        fluxTracker.reset();
        analyzer.resetState();
        soundQualityVizPluginState.setStreamActive(false);
        return s ? s.stop() : Promise.resolve();
      };

      soundQualityVizPluginState.syncConfig(readConfig(moduleId));

      const handleFrame = (frame: AudioSampleFrame): void => {
        if (disposed) return;
        const live = analyzer.analyzeFrame(frame, fluxTracker);
        const loudness = frameLoudness(frame.samples);
        soundQualityVizPluginState.pushFrame(live.centroid, live.flux, loudness);
      };

      const unlisten = subscribeMicrophoneStream(moduleId, (stream) => {
        void stopSampler().then(() => {
          if (disposed) return;
          if (!stream || stream.getAudioTracks().length === 0) {
            soundQualityVizPluginState.reset();
            return;
          }

          const sampler = new LiveSampler({
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING,
          });
          currentSampler = sampler;
          analyzer.resetState();
          fluxTracker.reset();

          sampler.on('frame', handleFrame);
          sampler.on('start', () => {
            if (!disposed) soundQualityVizPluginState.setStreamActive(true);
          });
          sampler.on('stop', () => {
            soundQualityVizPluginState.setStreamActive(false);
          });
          sampler.on('error', () => {
            soundQualityVizPluginState.setStreamActive(false);
          });

          void sampler.start(stream).catch(() => undefined);
        });
      });

      return (): Promise<void> => {
        disposed = true;
        unlisten();
        return stopSampler().then(() => {
          soundQualityVizPluginState.reset();
        });
      };
    },
  };
}
