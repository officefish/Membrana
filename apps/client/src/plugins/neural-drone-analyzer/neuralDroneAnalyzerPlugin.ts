/**
 * ND2 — плагин нейро-детекции дрона (UC2 free): YAMNet zero-shot по сэмплу
 * библиотеки. Паритет поведения с trends-fft-sample-analyzer: ручной запуск +
 * автозапуск по окончании воспроизведения; при детекции — publishDroneDetected.
 *
 * Модель прогревается на install (warmUp, P2 ревью ND1) — первый анализ
 * не платит загрузку графа.
 */
import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import {
  getSamplePlaybackSnapshot,
  subscribeSamplePlayback,
} from '@membrana/sample-playback-service';
import { createYamnetDetector, YamnetDetector } from '@membrana/yamnet-detector-service';

import { publishDroneDetected } from '../../lib/droneDetectionHub';

import { analyzeSampleNeural } from './analyzeSampleNeural';
import {
  neuralDroneAnalyzerState,
  registerNeuralDroneController,
} from './neuralDroneAnalyzerState';
import { loadYamnetBrowserModel } from './yamnetBrowserModel';
import {
  defaultNeuralDroneAnalyzerConfig,
  NEURAL_DRONE_ANALYZER_PLUGIN_ID,
  resolveNeuralDroneAnalyzerConfig,
  type NeuralDroneAnalyzerPluginConfig,
} from './types';

function readPluginConfig(moduleId: string): NeuralDroneAnalyzerPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, NEURAL_DRONE_ANALYZER_PLUGIN_ID)?.config;
  return resolveNeuralDroneAnalyzerConfig(raw ?? defaultNeuralDroneAnalyzerConfig);
}

export function createNeuralDroneAnalyzerPlugin(): Plugin<NeuralDroneAnalyzerPluginConfig> {
  return {
    id: NEURAL_DRONE_ANALYZER_PLUGIN_ID,
    name: 'Нейро-детекция дрона (сэмпл)',
    description:
      'YAMNet (zero-shot, офлайн-бандл) по сэмплу библиотеки: вердикт дрон/не дрон, score дрон-классов AudioSet, топ-классы клипа',
    version: '0.1.0',
    active: false,
    config: { ...defaultNeuralDroneAnalyzerConfig },
    install(context: ModuleContext<NeuralDroneAnalyzerPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let inFlight = false;
      let prevStatus = getSamplePlaybackSnapshot().status;

      // Порог читается из конфига на каждый прогон; детектор пересоздавать не
      // нужно — scoring-опции передаются через options ниже при создании,
      // поэтому фиксируем конфиг на момент установки и при смене порога
      // пересоздаём детектор лениво (модель кэшируется провайдером — см. warmUp).
      let detector: YamnetDetector | null = null;
      let detectorThreshold: number | null = null;
      const getDetector = (): YamnetDetector => {
        const { droneScoreThreshold } = readPluginConfig(moduleId);
        if (detector === null || detectorThreshold !== droneScoreThreshold) {
          detector = createYamnetDetector({
            modelProvider: loadYamnetBrowserModel,
            scoring: { droneScoreThreshold },
          }) as YamnetDetector;
          detectorThreshold = droneScoreThreshold;
        }
        return detector;
      };

      const syncHubContext = (): void => {
        const hub = getSamplePlaybackSnapshot();
        neuralDroneAnalyzerState.setSampleContext({
          selectedSampleId: hub.selectedSampleId,
          selectedSampleTitle: hub.selectedTitle,
          blockedReason: hub.selectedSampleId ? null : 'Выберите сэмпл в таблице библиотеки.',
        });
      };

      const runAnalysis = async (sampleId: string): Promise<void> => {
        if (disposed || inFlight) return;
        inFlight = true;
        const hub = getSamplePlaybackSnapshot();
        neuralDroneAnalyzerState.beginAnalysis(sampleId, hub.selectedTitle);
        try {
          const result = await analyzeSampleNeural(getDetector(), sampleId);
          if (disposed) return;
          neuralDroneAnalyzerState.finishAnalysis(result);
          if (result.isDrone) {
            publishDroneDetected({
              sourceId: NEURAL_DRONE_ANALYZER_PLUGIN_ID,
              sourceLabel: 'Нейро-детекция дрона (сэмпл)',
              timestamp: Date.now(),
            });
          }
        } catch (e) {
          if (disposed) return;
          neuralDroneAnalyzerState.failAnalysis(e instanceof Error ? e.message : String(e));
        } finally {
          inFlight = false;
        }
      };

      registerNeuralDroneController({
        analyzeSelectedSample: (): void => {
          const hub = getSamplePlaybackSnapshot();
          if (!hub.selectedSampleId) return;
          void runAnalysis(hub.selectedSampleId);
        },
      });

      // Прогрев модели вне критического пути анализа (P2#3 ревью ND1).
      neuralDroneAnalyzerState.beginModelLoading();
      void getDetector()
        .warmUp()
        .then(() => {
          if (!disposed) neuralDroneAnalyzerState.finishModelLoading();
        })
        .catch((e: unknown) => {
          if (!disposed) {
            neuralDroneAnalyzerState.failModelLoading(
              `Модель не загрузилась: ${e instanceof Error ? e.message : String(e)}`,
            );
          }
        });

      const unsubHub = subscribeSamplePlayback(() => {
        if (disposed) return;
        const hub = getSamplePlaybackSnapshot();
        syncHubContext();

        const ended = prevStatus !== 'ended' && hub.status === 'ended';
        prevStatus = hub.status;

        if (ended && readPluginConfig(moduleId).autoAnalyzeOnEnd && hub.selectedSampleId) {
          void runAnalysis(hub.selectedSampleId);
        }
      });

      syncHubContext();

      return () => {
        disposed = true;
        unsubHub();
        registerNeuralDroneController(null);
        neuralDroneAnalyzerState.reset();
      };
    },
  };
}
