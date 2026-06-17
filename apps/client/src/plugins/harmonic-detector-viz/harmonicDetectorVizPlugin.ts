import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import { audioWindowFromFrame } from '@membrana/detector-base';
import type { DroneDetector } from '@membrana/detector-base';
import type { AudioSampleFrame } from '@membrana/audio-engine-service';
import {
  createHarmonicDetector,
  DEFAULT_FFT_SIZE,
} from '@membrana/harmonic-detector-service';

import { publishDroneDetected } from '../../lib/droneDetectionHub';
import {
  createAnalysisFrameFeed,
  type AudioFrameFeed,
} from '../../lib/audioAnalysis';

import { DetectionSmoother } from './detection-smooth';
import { harmonicDetectorPluginState } from './harmonicDetectorPluginState';
import { shouldThrottle } from './throttle';
import {
  HARMONIC_DETECTOR_SOURCE_LABEL,
  HARMONIC_DETECTOR_VIZ_PLUGIN_ID,
  defaultHarmonicDetectorVizConfig,
  harmonicDroneSourceId,
  resolveHarmonicDetectorVizConfig,
  type HarmonicDetectorVizPluginConfig,
} from './types';

const FFT_SIZE = DEFAULT_FFT_SIZE;
const SMOOTHING = 0.5;
const UI_THROTTLE_MS = 80;

export function createHarmonicDetectorVizPlugin(): Plugin<HarmonicDetectorVizPluginConfig> {
  return {
    id: HARMONIC_DETECTOR_VIZ_PLUGIN_ID,
    name: 'Гармонический детектор БПЛА',
    description: 'Live DSP-классификатор мультиротора по гармоническому стеку (80–250 Гц)',
    version: '1.0.0',
    active: false,
    config: { ...defaultHarmonicDetectorVizConfig },
    install(context: ModuleContext<HarmonicDetectorVizPluginConfig>): PluginTeardown {
      let disposed = false;
      let feed: AudioFrameFeed | null = null;
      let unsubFeed: (() => void) | null = null;
      let feedActive = false;
      let detector: DroneDetector = createHarmonicDetector({
        confidenceThreshold: resolveHarmonicDetectorVizConfig(context.config).confidenceThreshold,
        fftSize: FFT_SIZE,
      });
      const smoother = new DetectionSmoother();
      let stableIsDronePrev = false;
      let streamOriginMs = 0;
      let lastUiUpdateMs = 0;
      let inFlight = false;
      let threshold = resolveHarmonicDetectorVizConfig(context.config).confidenceThreshold;
      let analysisSource = resolveHarmonicDetectorVizConfig(context.config).analysisSource;
      let mountedAnalysisSource = analysisSource;

      harmonicDetectorPluginState.applyConfig(resolveHarmonicDetectorVizConfig(context.config));

      const stopFeed = async (): Promise<void> => {
        feedActive = false;
        if (feed) {
          await feed.stop();
        }
        harmonicDetectorPluginState.setLive(false);
        harmonicDetectorPluginState.setDetection(null);
        smoother.reset();
        stableIsDronePrev = false;
      };

      const syncDetector = (): void => {
        const next = harmonicDetectorPluginState.getSnapshot().confidenceThreshold;
        if (next === threshold) return;
        threshold = next;
        detector = createHarmonicDetector({ confidenceThreshold: threshold, fftSize: FFT_SIZE });
      };

      const handleFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !feedActive) return;
        if (shouldThrottle(lastUiUpdateMs, UI_THROTTLE_MS)) return;
        if (inFlight) return;

        inFlight = true;
        lastUiUpdateMs = performance.now();
        syncDetector();

        const window = audioWindowFromFrame(frame, streamOriginMs);
        void detector
          .detect(window)
          .then((result) => {
            if (disposed) return;
            const smoothed = smoother.update(
              {
                confidence: result.confidence,
                isDrone: result.isDrone,
                reasoning: result.reasoning,
              },
              threshold,
            );

            if (smoothed.stableIsDrone && !stableIsDronePrev) {
              publishDroneDetected({
                sourceId: harmonicDroneSourceId(analysisSource),
                sourceLabel: HARMONIC_DETECTOR_SOURCE_LABEL,
                timestamp: Date.now(),
                confidence: smoothed.displayConfidence,
              });
            }
            stableIsDronePrev = smoothed.stableIsDrone;

            harmonicDetectorPluginState.setDetection({
              isDrone: smoothed.stableIsDrone,
              confidence: smoothed.displayConfidence,
              reasoning: smoothed.displayReasoning,
              fundamentals: result.fundamentalsHz,
              latencyMs: result.latencyMs,
              rawConfidence: smoothed.rawConfidence,
            });
            harmonicDetectorPluginState.setAnalysisError(null);
          })
          .catch((err: unknown) => {
            if (disposed) return;
            harmonicDetectorPluginState.setAnalysisError(
              err instanceof Error ? err.message : String(err),
            );
          })
          .finally(() => {
            inFlight = false;
          });
      };

      const mountFeed = (): void => {
        unsubFeed?.();
        void stopFeed().then(() => {
          if (disposed) return;
          const raw = useMembranaStore
            .getState()
            .getPlugin(context.moduleId, HARMONIC_DETECTOR_VIZ_PLUGIN_ID)?.config;
          const config = resolveHarmonicDetectorVizConfig(raw);
          analysisSource = config.analysisSource;
          streamOriginMs = Date.now();

          feed = createAnalysisFrameFeed({
            analysisSource: config.analysisSource,
            moduleId: context.moduleId,
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING,
            onStart: () => {
              if (disposed) return;
              feedActive = true;
              streamOriginMs = Date.now();
              harmonicDetectorPluginState.setLive(true);
              smoother.reset();
              stableIsDronePrev = false;
            },
            onStop: () => {
              feedActive = false;
              harmonicDetectorPluginState.setLive(false);
              harmonicDetectorPluginState.setDetection(null);
              smoother.reset();
              stableIsDronePrev = false;
            },
            onError: () => {
              feedActive = false;
              harmonicDetectorPluginState.setLive(false);
              harmonicDetectorPluginState.setDetection(null);
              harmonicDetectorPluginState.setAnalysisError('Ошибка захвата аудио');
            },
          });

          unsubFeed = feed.subscribe(handleFrame);
          void feed.start();
        });
      };

      mountFeed();

      const unsubStore = useMembranaStore.subscribe(() => {
        const raw = useMembranaStore
          .getState()
          .getPlugin(context.moduleId, HARMONIC_DETECTOR_VIZ_PLUGIN_ID)?.config;
        const nextSource = resolveHarmonicDetectorVizConfig(raw).analysisSource;
        if (nextSource === mountedAnalysisSource) return;
        mountedAnalysisSource = nextSource;
        mountFeed();
      });

      return (): Promise<void> => {
        disposed = true;
        unsubStore();
        unsubFeed?.();
        unsubFeed = null;
        return stopFeed().then(() => {
          feed = null;
          harmonicDetectorPluginState.reset();
        });
      };
    },
  };
}
