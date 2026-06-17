import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import { LiveSampler, type AudioSampleFrame } from '@membrana/audio-engine-service';
import {
  FftAnalyzer,
  SpectralFluxTracker,
  applyPreset,
  DEFAULT_CONFIG,
  PRESETS,
  frameLoudness,
} from '@membrana/fft-analyzer-service';

import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';

import { fftIndicesVizPluginState } from './fftIndicesVizPluginState';
import {
  FFT_INDICES_VIZ_PLUGIN_ID,
  defaultFftIndicesVizConfig,
  resolveFftIndicesVizConfig,
  type FftIndicesVizPluginConfig,
} from './types';

const FFT_SIZE = 2048;
const SMOOTHING = 0.5;

function readConfig(moduleId: string): FftIndicesVizPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, FFT_INDICES_VIZ_PLUGIN_ID)?.config;
  return resolveFftIndicesVizConfig(raw ?? defaultFftIndicesVizConfig);
}

export function createFftIndicesVizPlugin(): Plugin<FftIndicesVizPluginConfig> {
  return {
    id: FFT_INDICES_VIZ_PLUGIN_ID,
    name: 'FFT-индексы',
    description: 'Live-визуализация центроида, спектрального потока и RMS',
    version: '1.0.0',
    active: false,
    config: { ...defaultFftIndicesVizConfig },
    install(context: ModuleContext<FftIndicesVizPluginConfig>): PluginTeardown {
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
            minRMS: DEFAULT_CONFIG.liveMode.minRMS,
            frequencyRange: { min: 50, max: 4_000 },
          },
        }),
      );

      const stopSampler = (): Promise<void> => {
        const s = currentSampler;
        currentSampler = null;
        fluxTracker.reset();
        analyzer.resetState();
        fftIndicesVizPluginState.setStreamActive(false);
        return s ? s.stop() : Promise.resolve();
      };

      fftIndicesVizPluginState.syncConfig(readConfig(moduleId));

      const handleFrame = (frame: AudioSampleFrame): void => {
        if (disposed) return;
        const live = analyzer.analyzeFrame(frame, fluxTracker);
        const loudness = frameLoudness(frame.samples);
        fftIndicesVizPluginState.pushFrame(live.centroid, live.flux, loudness);
      };

      const unlisten = subscribeMicrophoneStream(moduleId, (stream) => {
        void stopSampler().then(() => {
          if (disposed) return;
          if (!stream || stream.getAudioTracks().length === 0) {
            fftIndicesVizPluginState.reset();
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
            if (!disposed) fftIndicesVizPluginState.setStreamActive(true);
          });
          sampler.on('stop', () => {
            fftIndicesVizPluginState.setStreamActive(false);
          });
          sampler.on('error', () => {
            fftIndicesVizPluginState.setStreamActive(false);
          });

          void sampler.start(stream).catch(() => undefined);
        });
      });

      return (): Promise<void> => {
        disposed = true;
        unlisten();
        return stopSampler().then(() => {
          fftIndicesVizPluginState.reset();
        });
      };
    },
  };
}
