import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { LiveSampler, type AudioSampleFrame } from '@membrana/audio-engine-service';
import type { AudioWindow } from '@membrana/detector-base';
import { EnsembleProducer } from '@membrana/detection-ensemble-service';

import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';
import { StreamWindowCollector } from '../mic-live-drone-analysis/streamWindowCollector';

import { combinedDetectionState } from './combinedDetectionState';
import { createCombinedStreamDetectors } from './createCombinedStreamDetectors';
import {
  MIC_COMBINED_DETECTION_PLUGIN_ID,
  defaultMicCombinedDetectionConfig,
  resolveMicCombinedDetectionConfig,
  type MicCombinedDetectionPluginConfig,
} from './types';

/**
 * Плагин-ПРОДЮСЕР модуля «Микрофон»: combined-детекция (магистраль S2).
 *
 * Аккумулирует окно живого потока (StreamWindowCollector) и гоняет DSP-детекторы
 * через EnsembleProducer (detection-ensemble-service), который сливает их сырой
 * confidence в combinedScore fusion-ядром @membrana/core. Результат публикуется в
 * combinedDetectionState — оттуда его читает потребитель "mic-proximity-alarm"
 * (alarm-loop реагирует на combinedScore, а НЕ на сырую громкость).
 *
 * Аудио — ТОЛЬКО через engine (LiveSampler поверх shared MediaStream), без
 * прямого Web Audio. Слияние считает ядро; плагин — lifecycle + оркестрация.
 */

const FFT_SIZE = 2048;
const SMOOTHING_TIME_CONSTANT = 0.75;

export function createMicCombinedDetectionPlugin(): Plugin<MicCombinedDetectionPluginConfig> {
  return {
    id: MIC_COMBINED_DETECTION_PLUGIN_ID,
    name: 'Combined-детекция (спектр→fusion)',
    description:
      'combinedScore из fusion-ядра: DSP-детекторы на окне живого потока → взвешенное среднее сырого confidence. Источник тревоги для alarm-loop.',
    version: '1.0.0',
    active: false,
    config: { ...defaultMicCombinedDetectionConfig },
    install(context: ModuleContext<MicCombinedDetectionPluginConfig>): PluginTeardown {
      let currentSampler: LiveSampler | null = null;
      let disposed = false;
      let analyzing = false;

      const getConfig = (): MicCombinedDetectionPluginConfig =>
        resolveMicCombinedDetectionConfig(
          context.getPlugin(MIC_COMBINED_DETECTION_PLUGIN_ID)?.config ?? context.config,
        );

      const collector = new StreamWindowCollector();
      const detectors = createCombinedStreamDetectors();
      let producer = new EnsembleProducer(detectors, {
        smoothing: getConfig().smoothing,
      });

      const stopSampler = (): Promise<void> => {
        const s = currentSampler;
        currentSampler = null;
        collector.reset();
        producer.reset();
        combinedDetectionState.setLive(false);
        return s ? s.stop() : Promise.resolve();
      };

      const runWindow = (): void => {
        if (disposed || analyzing) return;
        let window: AudioWindow;
        try {
          const audio = collector.finish();
          window = {
            samples: audio.samples,
            sampleRate: audio.sampleRate,
            timestamp: Date.now(),
            durationSec: audio.durationSec,
          };
        } catch {
          return; // окно без кадров — молча пропускаем
        }
        analyzing = true;
        void producer
          .analyze(window)
          .then((result) => {
            if (disposed) return;
            combinedDetectionState.setReading({
              combinedScore: result.combinedScore,
              smoothedScore: result.smoothedScore,
              agreement: result.agreement,
              presentCount: result.presentCount,
              perSource: result.perSource.map((s) => ({
                name: s.name,
                family: s.family,
                confidence: s.confidence,
                present: s.present,
              })),
            });
          })
          .catch(() => undefined)
          .finally(() => {
            analyzing = false;
            // Начинаем следующее окно (rolling), если поток ещё жив.
            if (!disposed && currentSampler) collector.begin(getConfig().windowSec);
          });
      };

      const handleFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !currentSampler) return;
        if (!collector.isCollecting()) return;
        const windowComplete = collector.push(frame);
        if (windowComplete) runWindow();
      };

      const unlisten = subscribeMicrophoneStream(context.moduleId, (stream) => {
        void stopSampler().then(() => {
          if (disposed) return;
          if (!stream || stream.getAudioTracks().length === 0) return;

          producer = new EnsembleProducer(detectors, {
            smoothing: getConfig().smoothing,
          });

          const sampler = new LiveSampler({
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING_TIME_CONSTANT,
          });
          currentSampler = sampler;

          sampler.on('frame', handleFrame);
          sampler.on('start', () => {
            if (disposed) return;
            combinedDetectionState.setLive(true);
            collector.begin(getConfig().windowSec);
          });
          sampler.on('stop', () => combinedDetectionState.setLive(false));
          sampler.on('error', () => {
            combinedDetectionState.reset();
          });

          void sampler.start(stream).catch(() => undefined);
        });
      });

      return (): Promise<void> => {
        disposed = true;
        unlisten();
        return stopSampler().then(() => {
          combinedDetectionState.reset();
        });
      };
    },
  };
}
