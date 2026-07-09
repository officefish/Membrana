import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { LiveSampler, type AudioSampleFrame } from '@membrana/audio-engine-service';
import {
  LoudnessTrendTracker,
  evaluateProximityAlarm,
  frameLoudness,
} from '@membrana/fft-analyzer-service';

import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';
import { combinedDetectionState } from '../mic-combined-detection';

import { micProximityPluginState } from './micProximityPluginState';
import {
  MIC_PROXIMITY_ALARM_PLUGIN_ID,
  defaultMicProximityAlarmConfig,
  resolveMicProximityAlarmConfig,
  type MicProximityAlarmPluginConfig,
} from './types';

/**
 * Плагин модуля «Микрофон»: alarm-loop «ближе/дальше» (Задача B).
 *
 * Оценивает ТРЕНД громкости живого потока (приближается / удаляется / стабильно)
 * и гейт тревоги по combinedScore fusion-ядра A. Вся математика — чистая
 * (LoudnessTrendTracker / evaluateProximityAlarm из fft-analyzer); здесь только
 * lifecycle: подписка на кадры движка и обновление singleton-состояния.
 *
 * Аудио берётся ТОЛЬКО через engine (LiveSampler поверх shared MediaStream из
 * microphoneStreamHub) — без прямого Web Audio. combinedScore читается из живого
 * combined-продюсера (mic-combined-detection) через combinedDetectionState; пока
 * продюсер не активен — 0 и тревога неактивна.
 *
 * См. microphone-stream-viz как эталон lifecycle-контракта.
 */

const FFT_SIZE = 2048;
const SMOOTHING = 0.75;

export function createMicProximityAlarmPlugin(): Plugin<MicProximityAlarmPluginConfig> {
  return {
    id: MIC_PROXIMITY_ALARM_PLUGIN_ID,
    name: 'Alarm-loop «ближе/дальше»',
    description:
      'Тренд громкости источника (приближается/удаляется/стабильно) + порог тревоги по combined-детекции',
    version: '1.0.0',
    active: false,
    config: { ...defaultMicProximityAlarmConfig },
    install(context: ModuleContext<MicProximityAlarmPluginConfig>): PluginTeardown {
      let currentSampler: LiveSampler | null = null;
      let disposed = false;

      const getConfig = (): MicProximityAlarmPluginConfig =>
        resolveMicProximityAlarmConfig(
          context.getPlugin(MIC_PROXIMITY_ALARM_PLUGIN_ID)?.config ?? context.config,
        );

      let tracker = new LoudnessTrendTracker(configToTrackerOptions(getConfig()));

      const stopSampler = (): Promise<void> => {
        const s = currentSampler;
        currentSampler = null;
        tracker.reset();
        micProximityPluginState.setLive(false);
        return s ? s.stop() : Promise.resolve();
      };

      const handleFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !currentSampler) return;
        const config = getConfig();
        const loudness = frameLoudness(frame.samples);
        const { trend, ready } = tracker.next(loudness);
        // combinedScore из живого combined-продюсера (mic-combined-detection) через
        // shared-store: fusion-ядро питает тревогу, а не сырая громкость. Пока
        // продюсер не активен (плагин выключен) — combinedDetectionState.live=false → 0.
        const combined = combinedDetectionState.getSnapshot();
        const hasCombinedSource = combined.live;
        const combinedScore = hasCombinedSource ? combined.smoothedScore : 0;
        const alarm = evaluateProximityAlarm(
          { combinedScore, trend },
          { scoreThreshold: config.scoreThreshold },
        );
        micProximityPluginState.setReading({
          trend,
          loudness,
          ready,
          combinedScore,
          hasCombinedSource,
          alarm,
        });
      };

      const unlisten = subscribeMicrophoneStream(context.moduleId, (stream) => {
        void stopSampler().then(() => {
          if (disposed) return;
          if (!stream || stream.getAudioTracks().length === 0) return;

          // Пересоздаём трекер под актуальный конфиг при каждом новом потоке.
          tracker = new LoudnessTrendTracker(configToTrackerOptions(getConfig()));

          const sampler = new LiveSampler({
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING,
          });
          currentSampler = sampler;

          sampler.on('frame', handleFrame);
          sampler.on('start', () => {
            if (disposed) return;
            micProximityPluginState.setLive(true);
          });
          sampler.on('stop', () => micProximityPluginState.setLive(false));
          sampler.on('error', () => {
            micProximityPluginState.reset();
          });

          void sampler.start(stream).catch(() => undefined);
        });
      });

      return (): Promise<void> => {
        disposed = true;
        unlisten();
        return stopSampler().then(() => {
          micProximityPluginState.reset();
        });
      };
    },
  };
}

function configToTrackerOptions(config: MicProximityAlarmPluginConfig): {
  windowSize: number;
  approachRatio: number;
  recedeRatio: number;
} {
  return {
    windowSize: config.windowSize,
    approachRatio: config.approachRatio,
    recedeRatio: config.recedeRatio,
  };
}
