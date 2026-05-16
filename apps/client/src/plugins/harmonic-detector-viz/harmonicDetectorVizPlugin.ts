import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { audioWindowFromFrame } from '@membrana/detector-base';
import { LiveSampler, type AudioSampleFrame } from '@membrana/audio-engine-service';
import {
  createHarmonicDetector,
  DEFAULT_FFT_SIZE,
  type HarmonicDetector,
} from '@membrana/harmonic-detector-service';

import { publishDroneDetected } from '../../lib/droneDetectionHub';
import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';
import { DetectionSmoother } from './detection-smooth';
import { harmonicDetectorPluginState } from './harmonicDetectorPluginState';
import { shouldThrottle } from './throttle';
import {
  HARMONIC_DETECTOR_SOURCE_ID,
  HARMONIC_DETECTOR_SOURCE_LABEL,
  HARMONIC_DETECTOR_VIZ_PLUGIN_ID,
  defaultHarmonicDetectorVizConfig,
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
      let currentSampler: LiveSampler | null = null;
      let detector: HarmonicDetector = createHarmonicDetector({
        confidenceThreshold: resolveHarmonicDetectorVizConfig(context.config).confidenceThreshold,
        fftSize: FFT_SIZE,
      });
      const smoother = new DetectionSmoother();
      let stableIsDronePrev = false;
      let streamOriginMs = 0;
      let lastUiUpdateMs = 0;
      let inFlight = false;
      let threshold = resolveHarmonicDetectorVizConfig(context.config).confidenceThreshold;

      harmonicDetectorPluginState.applyConfig(resolveHarmonicDetectorVizConfig(context.config));

      const stopSampler = (): Promise<void> => {
        const sampler = currentSampler;
        currentSampler = null;
        harmonicDetectorPluginState.setLive(false);
        harmonicDetectorPluginState.setDetection(null);
        smoother.reset();
        stableIsDronePrev = false;
        return sampler ? sampler.stop() : Promise.resolve();
      };

      const syncDetector = (): void => {
        const next = harmonicDetectorPluginState.getSnapshot().confidenceThreshold;
        if (next === threshold) return;
        threshold = next;
        detector = createHarmonicDetector({ confidenceThreshold: threshold, fftSize: FFT_SIZE });
      };

      const handleFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !currentSampler) return;
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
                sourceId: HARMONIC_DETECTOR_SOURCE_ID,
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

      const unlisten = subscribeMicrophoneStream(context.moduleId, (stream) => {
        void stopSampler().then(() => {
          if (disposed) return;
          if (!stream || stream.getAudioTracks().length === 0) {
            harmonicDetectorPluginState.setLive(false);
            return;
          }

          streamOriginMs = Date.now();
          const sampler = new LiveSampler({
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING,
          });
          currentSampler = sampler;

          sampler.on('frame', handleFrame);
          sampler.on('start', () => {
            if (disposed) return;
            harmonicDetectorPluginState.setLive(true);
            smoother.reset();
            stableIsDronePrev = false;
          });
          sampler.on('stop', () => {
            harmonicDetectorPluginState.setLive(false);
            harmonicDetectorPluginState.setDetection(null);
            smoother.reset();
            stableIsDronePrev = false;
          });
          sampler.on('error', () => {
            harmonicDetectorPluginState.setLive(false);
            harmonicDetectorPluginState.setDetection(null);
            harmonicDetectorPluginState.setAnalysisError('Ошибка захвата аудио');
          });

          void sampler.start(stream).catch(() => undefined);
        });
      });

      return (): Promise<void> => {
        disposed = true;
        unlisten();
        return stopSampler().then(() => {
          harmonicDetectorPluginState.reset();
        });
      };
    },
  };
}
