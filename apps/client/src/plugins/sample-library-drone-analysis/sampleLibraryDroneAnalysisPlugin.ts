import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import {
  getSamplePlaybackSnapshot,
  subscribeSamplePlayback,
} from '@membrana/sample-playback-service';

import { analyzeSampleDetectors } from './analyzeSampleDetectors';
import {
  registerSampleLibraryDroneController,
  sampleLibraryDronePluginState,
} from './sampleLibraryDronePluginState';
import {
  defaultSampleLibraryDroneAnalysisConfig,
  resolveSampleLibraryDroneAnalysisConfig,
  SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID,
  type SampleLibraryDroneAnalysisPluginConfig,
} from './types';

function readPluginConfig(moduleId: string): SampleLibraryDroneAnalysisPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID)?.config;
  return resolveSampleLibraryDroneAnalysisConfig(
    raw ?? defaultSampleLibraryDroneAnalysisConfig,
  );
}

export function createSampleLibraryDroneAnalysisPlugin(): Plugin<SampleLibraryDroneAnalysisPluginConfig> {
  return {
    id: SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID,
    name: 'Анализ дрона (сэмпл)',
    description:
      'Вердикт DSP-детекторов по целому 5-с сэмплу после воспроизведения или по кнопке',
    version: '0.1.0',
    active: false,
    config: { ...defaultSampleLibraryDroneAnalysisConfig },
    install(context: ModuleContext<SampleLibraryDroneAnalysisPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let inFlight = false;
      let prevStatus = getSamplePlaybackSnapshot().status;

      const syncHubContext = (): void => {
        const hub = getSamplePlaybackSnapshot();
        sampleLibraryDronePluginState.setSampleContext({
          selectedSampleId: hub.selectedSampleId,
          selectedSampleTitle: hub.selectedTitle,
        });
      };

      const runAnalysis = async (sampleId: string): Promise<void> => {
        if (disposed || inFlight) return;
        inFlight = true;
        sampleLibraryDronePluginState.beginAnalysis(sampleId);

        try {
          const verdicts = await analyzeSampleDetectors(sampleId);
          if (disposed) return;
          sampleLibraryDronePluginState.finishAnalysis(sampleId, verdicts);
        } catch (e) {
          if (disposed) return;
          const message = e instanceof Error ? e.message : String(e);
          sampleLibraryDronePluginState.failAnalysis(message);
        } finally {
          inFlight = false;
        }
      };

      const analyzeSelectedSample = (): void => {
        const hub = getSamplePlaybackSnapshot();
        if (!hub.selectedSampleId) return;
        void runAnalysis(hub.selectedSampleId);
      };

      registerSampleLibraryDroneController({ analyzeSelectedSample });

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
        registerSampleLibraryDroneController(null);
        sampleLibraryDronePluginState.reset();
      };
    },
  };
}
