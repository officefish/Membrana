import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import type { AudioSampleFrame } from '@membrana/audio-engine-service';
import type { MediaLibrarySampleImportedPayload } from '@membrana/media-library-service';

import { createAnalysisFrameFeed, type AudioFrameFeed } from '@/lib/audioAnalysis';
import { subscribeMediaLibrarySampleImported } from '@/lib/mediaLibraryHub';
import { MIC_BUFFER_RECORDER_PLUGIN_ID } from '@/plugins/mic-buffer-recorder/types';
import { appendLiveJournalReportFromDroneBrief } from './appendLiveDroneBriefReport';
import {
  analyzeStreamDetectorsBrief,
  syntheticStreamTrackId,
} from './analyzeStreamDetectors';
import { analyzeSampleDetectorsBrief } from './analyzeSampleDetectorsBrief';
import {
  micLiveDronePluginState,
  registerMicLiveDroneController,
} from './micLiveDronePluginState';
import { StreamWindowCollector } from './streamWindowCollector';
import {
  defaultMicLiveDroneAnalysisConfig,
  isStreamAnalysisMode,
  isTrackImportAnalysisEnabled,
  MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID,
  resolveMicLiveDroneAnalysisConfig,
  type MicLiveDroneAnalysisPluginConfig,
} from './types';

const FFT_SIZE = 2048;
const SMOOTHING = 0.5;
const STREAM_PROGRESS_INTERVAL_MS = 100;

function readPluginConfig(
  moduleId: string,
  installFallback?: MicLiveDroneAnalysisPluginConfig,
): MicLiveDroneAnalysisPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID)?.config;
  if (raw !== undefined) {
    return resolveMicLiveDroneAnalysisConfig(raw);
  }
  if (installFallback !== undefined) {
    return resolveMicLiveDroneAnalysisConfig(installFallback);
  }
  return resolveMicLiveDroneAnalysisConfig(defaultMicLiveDroneAnalysisConfig);
}

function syncStateFromConfig(config: MicLiveDroneAnalysisPluginConfig): void {
  micLiveDronePluginState.syncConfig({
    analysisMode: config.analysisMode,
    streamWindowSec: config.streamWindowSec,
    streamPauseSec: config.streamPauseSec,
  });
}

export function createMicLiveDroneAnalysisPlugin(): Plugin<MicLiveDroneAnalysisPluginConfig> {
  return {
    id: MIC_LIVE_DRONE_ANALYSIS_PLUGIN_ID,
    name: 'Анализ дрона (live)',
    description:
      'Краткий отчёт в журнал (3 DSP); подробный DDR — по запросу на сервер',
    version: '0.2.0',
    active: false,
    config: { ...defaultMicLiveDroneAnalysisConfig },
    install(context: ModuleContext<MicLiveDroneAnalysisPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      const installConfig = resolveMicLiveDroneAnalysisConfig(
        context.config ?? defaultMicLiveDroneAnalysisConfig,
      );
      let disposed = false;
      let trackImportInFlight = false;
      let pendingImport: MediaLibrarySampleImportedPayload | null = null;
      let feed: AudioFrameFeed | null = null;
      let unsubFeed: (() => void) | null = null;
      let feedActive = false;
      let pauseTimer: ReturnType<typeof setTimeout> | null = null;
      let progressTimer: ReturnType<typeof setInterval> | null = null;
      let streamFinalizing = false;
      const windowCollector = new StreamWindowCollector();
      let mountedAnalysisMode = readPluginConfig(moduleId, installConfig).analysisMode;

      const getConfig = (): MicLiveDroneAnalysisPluginConfig =>
        readPluginConfig(moduleId, installConfig);

      const clearPauseTimer = (): void => {
        if (pauseTimer !== null) {
          clearTimeout(pauseTimer);
          pauseTimer = null;
        }
      };

      const clearProgressTimer = (): void => {
        if (progressTimer !== null) {
          clearInterval(progressTimer);
          progressTimer = null;
        }
      };

      const stopFeed = async (): Promise<void> => {
        clearPauseTimer();
        clearProgressTimer();
        windowCollector.reset();
        streamFinalizing = false;
        feedActive = false;
        if (feed) {
          await feed.stop();
        }
        micLiveDronePluginState.setStreamLive(false);
      };

      const scheduleStreamPause = (): void => {
        clearPauseTimer();
        const config = getConfig();
        micLiveDronePluginState.beginStreamPause();
        pauseTimer = setTimeout(() => {
          if (disposed || !feedActive) return;
          micLiveDronePluginState.resetToIdleAfterStream();
          const latest = getConfig();
          if (latest.analysisMode === 'stream-auto') {
            beginStreamCollection();
          }
        }, config.streamPauseSec * 1000);
      };

      const finalizeStreamWindow = async (): Promise<void> => {
        if (disposed || streamFinalizing) return;
        streamFinalizing = true;
        clearProgressTimer();
        micLiveDronePluginState.beginStreamFinalize();

        try {
          const audio = windowCollector.finish();
          const config = getConfig();
          const title =
            config.analysisMode === 'stream-auto'
              ? `stream-auto-${config.streamWindowSec}s`
              : `stream-manual-${config.streamWindowSec}s`;
          const { verdicts, report } = await analyzeStreamDetectorsBrief(audio, {
            title,
            analysisMode: config.analysisMode,
          });
          if (disposed) return;

          const trackId = syntheticStreamTrackId(moduleId, report.meta.reportId);
          await appendLiveJournalReportFromDroneBrief({
            moduleId,
            trackId,
            report,
          });
          if (disposed) return;

          micLiveDronePluginState.finishStreamCycle(verdicts, report);
          scheduleStreamPause();
        } catch (e) {
          if (disposed) return;
          const message = e instanceof Error ? e.message : String(e);
          micLiveDronePluginState.failAnalysis(message);
        } finally {
          streamFinalizing = false;
          windowCollector.reset();
        }
      };

      const beginStreamCollection = (): void => {
        if (disposed || !feedActive || streamFinalizing) return;
        const config = getConfig();
        if (!isStreamAnalysisMode(config.analysisMode)) return;

        clearPauseTimer();
        syncStateFromConfig(config);
        windowCollector.reset();
        windowCollector.begin(config.streamWindowSec);
        micLiveDronePluginState.beginStreamCollection();

        clearProgressTimer();
        progressTimer = setInterval(() => {
          if (!windowCollector.isCollecting()) return;
          micLiveDronePluginState.updateStreamElapsed(windowCollector.elapsedMs());
        }, STREAM_PROGRESS_INTERVAL_MS);
      };

      const handleAudioFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !feedActive || streamFinalizing) return;
        const config = getConfig();
        if (!isStreamAnalysisMode(config.analysisMode)) return;

        if (config.analysisMode === 'stream-auto' && !windowCollector.isCollecting()) {
          beginStreamCollection();
        }

        if (!windowCollector.isCollecting()) return;

        const windowComplete = windowCollector.push(frame);
        micLiveDronePluginState.updateStreamElapsed(windowCollector.elapsedMs());
        if (windowComplete) {
          void finalizeStreamWindow();
        }
      };

      const mountStreamFeed = (): void => {
        unsubFeed?.();
        void stopFeed().then(() => {
          if (disposed) return;
          const config = getConfig();
          if (!isStreamAnalysisMode(config.analysisMode)) return;

          syncStateFromConfig(config);

          feed = createAnalysisFrameFeed({
            analysisSource: 'microphone',
            moduleId,
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING,
            onStart: () => {
              if (disposed) return;
              feedActive = true;
              micLiveDronePluginState.setStreamLive(true);
              const latest = getConfig();
              if (latest.analysisMode === 'stream-auto') {
                beginStreamCollection();
              }
            },
            onStop: () => {
              feedActive = false;
              clearPauseTimer();
              clearProgressTimer();
              windowCollector.reset();
              micLiveDronePluginState.setStreamLive(false);
            },
            onError: () => {
              feedActive = false;
              clearPauseTimer();
              clearProgressTimer();
              windowCollector.reset();
              micLiveDronePluginState.setStreamLive(false);
            },
          });

          unsubFeed = feed.subscribe(handleAudioFrame);
          void feed.start();
        });
      };

      const runTrackImportAnalysis = async (
        payload: MediaLibrarySampleImportedPayload,
      ): Promise<void> => {
        if (disposed) return;

        trackImportInFlight = true;
        micLiveDronePluginState.setImportContext({
          sampleId: payload.sampleId,
          sampleTitle: payload.title,
          journalTrackId: payload.journalTrackId,
        });
        micLiveDronePluginState.beginAnalysis(payload.sampleId);

        try {
          const { verdicts, report } = await analyzeSampleDetectorsBrief(
            payload.sampleId,
            payload.title,
          );
          if (disposed) return;

          await appendLiveJournalReportFromDroneBrief({
            moduleId: payload.moduleId,
            trackId: payload.journalTrackId ?? '',
            report,
          });
          if (disposed) return;

          micLiveDronePluginState.finishAnalysis(payload.sampleId, verdicts, report);
        } catch (e) {
          if (disposed) return;
          const message = e instanceof Error ? e.message : String(e);
          micLiveDronePluginState.failAnalysis(message);
        } finally {
          trackImportInFlight = false;
          drainPendingImport();
        }
      };

      // Backpressure: keep at most one analysis in flight plus one queued (latest wins).
      const drainPendingImport = (): void => {
        if (disposed || trackImportInFlight) return;
        const next = pendingImport;
        if (!next) return;
        pendingImport = null;
        micLiveDronePluginState.setTrackQueued(null);
        if (!isTrackImportAnalysisEnabled(getConfig())) return;
        void runTrackImportAnalysis(next);
      };

      const enqueueTrackImport = (payload: MediaLibrarySampleImportedPayload): void => {
        if (!payload.journalTrackId) return;
        const config = getConfig();
        if (!isTrackImportAnalysisEnabled(config)) return;

        if (trackImportInFlight) {
          // A newer clip arrived while busy: drop the previously queued one (if any) and keep latest.
          if (pendingImport) {
            micLiveDronePluginState.incrementTrackSkipped();
          }
          pendingImport = payload;
          micLiveDronePluginState.setTrackQueued(payload.title);
          return;
        }
        void runTrackImportAnalysis(payload);
      };

      const unsubImported = subscribeMediaLibrarySampleImported((payload) => {
        if (disposed) return;
        if (payload.sourcePluginId !== MIC_BUFFER_RECORDER_PLUGIN_ID) return;
        if (payload.moduleId !== moduleId) return;
        enqueueTrackImport(payload);
      });

      registerMicLiveDroneController({
        startManualWindow: () => {
          if (disposed || !feedActive) return;
          const config = getConfig();
          if (config.analysisMode !== 'stream-manual') return;
          if (windowCollector.isCollecting() || streamFinalizing) return;
          beginStreamCollection();
        },
      });

      syncStateFromConfig(getConfig());
      if (isStreamAnalysisMode(mountedAnalysisMode)) {
        mountStreamFeed();
      }

      const unsubStore = useMembranaStore.subscribe(() => {
        const nextMode = getConfig().analysisMode;
        if (nextMode === mountedAnalysisMode) return;
        mountedAnalysisMode = nextMode;
        if (isStreamAnalysisMode(nextMode)) {
          mountStreamFeed();
          return;
        }
        void stopFeed().then(() => {
          feed = null;
          unsubFeed = null;
        });
      });

      return () => {
        disposed = true;
        pendingImport = null;
        unsubStore();
        unsubImported();
        registerMicLiveDroneController(null);
        unsubFeed?.();
        unsubFeed = null;
        clearPauseTimer();
        clearProgressTimer();
        void stopFeed().then(() => {
          feed = null;
          micLiveDronePluginState.reset();
        });
      };
    },
  };
}
