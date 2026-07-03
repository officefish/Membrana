import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import type { AudioSampleFrame } from '@membrana/audio-engine-service';

import { createAnalysisFrameFeed, type AudioFrameFeed } from '@/lib/audioAnalysis';

import { analyzeVdrPcm } from './analyzeVdrAudio';
import { registerVdrLiveController, vdrValidationState } from './vdrValidationState';
import { VDR_LIVE_WINDOW_SEC, VDR_VALIDATION_PLUGIN_ID } from './types';

const FFT_SIZE = 2048;
const SMOOTHING = 0.5;

/**
 * Плагин «VDR-валидация» модуля «Микрофон» (vdr-hg2): прогон trends на
 * пилотном корпусе hard-gate (панель, файлы + манифест) и live-окно 5 с
 * с микрофона. Звук — только через audio-engine (createAnalysisFrameFeed /
 * loadAudioBuffer); прогон корпуса запускает панель, install держит live-feed.
 */
export function createVdrValidationPlugin(): Plugin {
  return {
    id: VDR_VALIDATION_PLUGIN_ID,
    name: 'VDR-валидация',
    description:
      'Пилотный корпус hard-gate: pred-vs-truth и метрики gate (P/R/F1); live-окно trends 5 с',
    version: '0.1.0',
    active: false,
    install(context: ModuleContext): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let feed: AudioFrameFeed | null = null;
      let unsubFeed: (() => void) | null = null;
      let collecting = false;
      let collected: Float32Array[] = [];
      let collectedFrames = 0;
      let targetFrames = 0;
      let sampleRate = 48_000;

      const finalizeLiveWindow = (): void => {
        if (disposed || !collecting) return;
        collecting = false;
        const total = collected.reduce((sum, chunk) => sum + chunk.length, 0);
        const pcm = new Float32Array(total);
        let offset = 0;
        for (const chunk of collected) {
          pcm.set(chunk, offset);
          offset += chunk.length;
        }
        collected = [];
        void stopFeed().then(() => {
          if (disposed) return;
          try {
            const verdict = analyzeVdrPcm(pcm, sampleRate);
            vdrValidationState.setLiveVerdict({ ...verdict, at: Date.now() });
          } catch (e) {
            vdrValidationState.setLiveVerdict(null);
            vdrValidationState.failRun(e instanceof Error ? e.message : String(e));
          }
        });
      };

      const handleFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !collecting) return;
        sampleRate = frame.sampleRate;
        collected.push(new Float32Array(frame.samples));
        collectedFrames += frame.samples.length;
        if (targetFrames === 0) {
          targetFrames = frame.sampleRate * VDR_LIVE_WINDOW_SEC;
        }
        if (collectedFrames >= targetFrames) {
          finalizeLiveWindow();
        }
      };

      const stopFeed = async (): Promise<void> => {
        unsubFeed?.();
        unsubFeed = null;
        if (feed) {
          await feed.stop();
          feed = null;
        }
      };

      const startLiveWindow = (): void => {
        if (disposed || collecting) return;
        collecting = true;
        collected = [];
        collectedFrames = 0;
        targetFrames = 0;
        vdrValidationState.setLiveCollecting(true);

        feed = createAnalysisFrameFeed({
          analysisSource: 'microphone',
          moduleId,
          bufferSize: FFT_SIZE,
          smoothingTimeConstant: SMOOTHING,
          onStop: () => {
            if (collecting) {
              collecting = false;
              collected = [];
              vdrValidationState.setLiveCollecting(false);
            }
          },
          onError: () => {
            collecting = false;
            collected = [];
            vdrValidationState.setLiveCollecting(false);
          },
        });
        unsubFeed = feed.subscribe(handleFrame);
        void feed.start();
      };

      registerVdrLiveController({ startLiveWindow });

      return () => {
        disposed = true;
        collecting = false;
        collected = [];
        registerVdrLiveController(null);
        void stopFeed().then(() => {
          vdrValidationState.reset();
        });
      };
    },
  };
}
