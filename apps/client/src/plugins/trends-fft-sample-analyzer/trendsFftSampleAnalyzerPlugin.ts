import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import {
  getSamplePlaybackSnapshot,
  subscribeSamplePlayback,
} from '@membrana/sample-playback-service';

import { isDroneTightTrendsDetection } from '../../lib/droneTightCalibration';
import { publishDroneDetected } from '../../lib/droneDetectionHub';
import { logTrendsFftResult } from '../trends-fft-analyzer/trendsFftTelemetry';

import { analyzeSampleTrendsFft } from './analyzeSampleTrendsFft';
import {
  registerTrendsFftSampleController,
  trendsFftSamplePluginState,
} from './trendsFftSamplePluginState';
import {
  defaultTrendsFftSampleAnalyzerConfig,
  resolveTrendsFftSampleAnalyzerConfig,
  TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID,
  type TrendsFftSampleAnalyzerPluginConfig,
} from './types';

function readPluginConfig(moduleId: string): TrendsFftSampleAnalyzerPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID)?.config;
  return resolveTrendsFftSampleAnalyzerConfig(raw ?? defaultTrendsFftSampleAnalyzerConfig);
}

export function createTrendsFftSampleAnalyzerPlugin(): Plugin<TrendsFftSampleAnalyzerPluginConfig> {
  return {
    id: TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID,
    name: 'Анализатор тенденций FFT (сэмпл)',
    description:
      'Trends-fft с пресетом DRONE_TIGHT по сэмплу библиотеки (offline, паритет с benchmark); отчёт trends-fft/v0.1 в журнал',
    version: '1.1.0',
    active: false,
    config: { ...defaultTrendsFftSampleAnalyzerConfig },
    install(context: ModuleContext<TrendsFftSampleAnalyzerPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let inFlight = false;
      let prevStatus = getSamplePlaybackSnapshot().status;

      const syncHubContext = (): void => {
        const hub = getSamplePlaybackSnapshot();
        const config = readPluginConfig(moduleId);
        trendsFftSamplePluginState.setSampleContext({
          selectedSampleId: hub.selectedSampleId,
          selectedSampleTitle: hub.selectedTitle,
          durationPlan: hub.durationSec > 0
            ? {
                status: 'ok',
                fileDurationSec: hub.durationSec,
                analysisSegmentSec: Math.min(hub.durationSec, 10),
                requestedMeasurementsCount: config.measurementsCount,
                effectiveMeasurementsCount: config.measurementsCount,
                intervalMs: config.intervalMs,
                message: null,
              }
            : null,
          blockedReason: hub.selectedSampleId ? null : 'Выберите сэмпл в таблице библиотеки.',
          ready: Boolean(hub.selectedSampleId && hub.durationSec > 0),
        });
        trendsFftSamplePluginState.syncConfig({
          measurementsCount: config.measurementsCount,
          intervalMs: config.intervalMs,
          minRms: config.minRms,
        });
      };

      const runAnalysis = async (sampleId: string): Promise<void> => {
        if (disposed || inFlight) return;
        inFlight = true;
        const config = readPluginConfig(moduleId);
        trendsFftSamplePluginState.beginOfflineAnalysis(sampleId, config.measurementsCount);

        try {
          const { report, result } = await analyzeSampleTrendsFft(sampleId, config);
          if (disposed) return;

          trendsFftSamplePluginState.finishOfflineAnalysis(
            sampleId,
            report,
            result,
            {
              measurementsCount: config.measurementsCount,
              intervalMs: config.intervalMs,
            },
          );

          logTrendsFftResult(moduleId, report);

          if (isDroneTightTrendsDetection(report.detectedState, report.isDetected)) {
            publishDroneDetected({
              sourceId: TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID,
              sourceLabel: 'Анализатор тенденций FFT (сэмпл)',
              timestamp: report.finishedAt,
            });
          }
        } catch (e) {
          if (disposed) return;
          const message = e instanceof Error ? e.message : String(e);
          trendsFftSamplePluginState.failOfflineAnalysis(message);
        } finally {
          inFlight = false;
        }
      };

      const analyzeSelectedSample = (): void => {
        const hub = getSamplePlaybackSnapshot();
        if (!hub.selectedSampleId) return;
        void runAnalysis(hub.selectedSampleId);
      };

      registerTrendsFftSampleController({ analyzeSelectedSample });

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
        registerTrendsFftSampleController(null);
        trendsFftSamplePluginState.reset();
      };
    },
  };
}
