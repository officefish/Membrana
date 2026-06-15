import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import type { MediaLibrarySampleImportedPayload } from '@membrana/media-library-service';

import { appendLiveJournalReportFromDroneDetection } from '@/lib/liveJournalReportWriter';
import { subscribeMediaLibrarySampleImported } from '@/lib/mediaLibraryHub';
import { analyzeSampleDetectors } from '@/plugins/sample-library-drone-analysis/analyzeSampleDetectors';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';

import { micLiveDronePluginState } from './micLiveDronePluginState';
import {
  defaultMicLiveDroneAnalysisConfig,
  MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID,
  resolveMicLiveDroneAnalysisConfig,
  type MicLiveDroneAnalysisPluginConfig,
} from './types';

function readPluginConfig(moduleId: string): MicLiveDroneAnalysisPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID)?.config;
  return resolveMicLiveDroneAnalysisConfig(raw ?? defaultMicLiveDroneAnalysisConfig);
}

export function createMicLiveDroneAnalysisPlugin(): Plugin<MicLiveDroneAnalysisPluginConfig> {
  return {
    id: MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID,
    name: 'Анализ дрона (live)',
    description:
      'DSP-детекторы и template-match по каждому новому клипу в буфере; отчёт в live-журнал',
    version: '0.1.0',
    active: false,
    config: { ...defaultMicLiveDroneAnalysisConfig },
    install(context: ModuleContext<MicLiveDroneAnalysisPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let inFlight = false;

      const runAnalysis = async (
        payload: MediaLibrarySampleImportedPayload,
      ): Promise<void> => {
        if (disposed || inFlight) return;
        if (!payload.journalTrackId) return;

        const config = readPluginConfig(moduleId);
        if (!config.autoAnalyzeOnImport) return;

        inFlight = true;
        micLiveDronePluginState.setImportContext({
          sampleId: payload.sampleId,
          sampleTitle: payload.title,
          journalTrackId: payload.journalTrackId,
        });
        micLiveDronePluginState.beginAnalysis(payload.sampleId);

        try {
          const { verdicts, report } = await analyzeSampleDetectors(
            payload.sampleId,
            payload.title,
          );
          if (disposed) return;

          await appendLiveJournalReportFromDroneDetection({
            moduleId: payload.moduleId,
            trackId: payload.journalTrackId,
            report,
          });
          if (disposed) return;

          micLiveDronePluginState.finishAnalysis(payload.sampleId, verdicts, report);
        } catch (e) {
          if (disposed) return;
          const message = e instanceof Error ? e.message : String(e);
          micLiveDronePluginState.failAnalysis(message);
        } finally {
          inFlight = false;
        }
      };

      const unsubImported = subscribeMediaLibrarySampleImported((payload) => {
        if (disposed) return;
        if (payload.sourcePluginId !== MIC_BUFFER_RECORDER_PLUGIN_ID) return;
        if (payload.moduleId !== moduleId) return;
        void runAnalysis(payload);
      });

      return () => {
        disposed = true;
        unsubImported();
        micLiveDronePluginState.reset();
      };
    },
  };
}
