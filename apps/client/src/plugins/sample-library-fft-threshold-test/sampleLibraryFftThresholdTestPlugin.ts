import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import {
  getSamplePlaybackSnapshot,
  subscribeSamplePlayback,
} from '@membrana/sample-playback-service';

import { publishDroneDetected } from '../../lib/droneDetectionHub';
import { appendFftThresholdJournalReport } from '../fft-threshold-test/appendFftThresholdJournalReport';

import { analyzeSampleFftThreshold } from './analyzeSampleFftThreshold';
import {
  registerSampleLibraryFftThresholdController,
  sampleLibraryFftThresholdState,
} from './sampleLibraryFftThresholdPluginState';
import {
  defaultSampleLibraryFftThresholdTestConfig,
  resolveSampleLibraryFftThresholdTestConfig,
  SAMPLE_LIBRARY_FFT_THRESHOLD_TEST_PLUGIN_ID,
  type SampleLibraryFftThresholdTestPluginConfig,
} from './types';

function readPluginConfig(moduleId: string): SampleLibraryFftThresholdTestPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, SAMPLE_LIBRARY_FFT_THRESHOLD_TEST_PLUGIN_ID)?.config;
  return resolveSampleLibraryFftThresholdTestConfig(
    raw ?? defaultSampleLibraryFftThresholdTestConfig,
  );
}

export function createSampleLibraryFftThresholdTestPlugin(): Plugin<SampleLibraryFftThresholdTestPluginConfig> {
  return {
    id: SAMPLE_LIBRARY_FFT_THRESHOLD_TEST_PLUGIN_ID,
    name: 'FFT пороговый тест (сэмпл)',
    description:
      'Пороговый FFT-тест (центроид, поток, RMS) по выбранному сэмплу библиотеки; отчёт fft-threshold-test/v0.2 в журнал',
    version: '1.0.0',
    active: false,
    config: { ...defaultSampleLibraryFftThresholdTestConfig },
    install(context: ModuleContext<SampleLibraryFftThresholdTestPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let inFlight = false;
      let prevStatus = getSamplePlaybackSnapshot().status;

      const syncHubContext = (): void => {
        const hub = getSamplePlaybackSnapshot();
        sampleLibraryFftThresholdState.setSampleContext({
          selectedSampleId: hub.selectedSampleId,
          selectedSampleTitle: hub.selectedTitle,
        });
      };

      const runAnalysis = async (sampleId: string): Promise<void> => {
        if (disposed || inFlight) return;
        inFlight = true;
        sampleLibraryFftThresholdState.beginAnalysis(sampleId);

        try {
          const config = readPluginConfig(moduleId);
          const report = await analyzeSampleFftThreshold(sampleId, config);
          if (disposed) return;
          sampleLibraryFftThresholdState.finishAnalysis(sampleId, report);
          void appendFftThresholdJournalReport({ moduleId, report }).catch(() => {
            /* journal append best-effort */
          });
          if (report.isDetected) {
            publishDroneDetected({
              sourceId: `${SAMPLE_LIBRARY_FFT_THRESHOLD_TEST_PLUGIN_ID}`,
              sourceLabel: 'FFT пороговый тест (сэмпл)',
              timestamp: report.finishedAt,
            });
          }
        } catch (e) {
          if (disposed) return;
          const message = e instanceof Error ? e.message : String(e);
          sampleLibraryFftThresholdState.failAnalysis(message);
        } finally {
          inFlight = false;
        }
      };

      const analyzeSelectedSample = (): void => {
        const hub = getSamplePlaybackSnapshot();
        if (!hub.selectedSampleId) return;
        void runAnalysis(hub.selectedSampleId);
      };

      registerSampleLibraryFftThresholdController({ analyzeSelectedSample });

      const unsubHub = subscribeSamplePlayback(() => {
        if (disposed) return;
        const hub = getSamplePlaybackSnapshot();
        syncHubContext();

        const ended = prevStatus !== 'ended' && hub.status === 'ended';
        prevStatus = hub.status;

        const config = readPluginConfig(moduleId);
        if (ended && config.autoAnalyzeOnEnd && hub.selectedSampleId) {
          void runAnalysis(hub.selectedSampleId);
        }
      });

      syncHubContext();

      return () => {
        disposed = true;
        unsubHub();
        registerSampleLibraryFftThresholdController(null);
        sampleLibraryFftThresholdState.reset();
      };
    },
  };
}
