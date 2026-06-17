import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import type { AudioSampleFrame } from '@membrana/audio-engine-service';
import {
  FftAnalyzer,
  SpectralFluxTracker,
  applyPreset,
  PRESETS,
  rms,
} from '@membrana/fft-analyzer-service';
import {
  classifyTrends,
  type MetricSample,
} from '@membrana/trends-detector-service';

import { createAnalysisFrameFeed, type AudioFrameFeed } from '../../lib/audioAnalysis';
import { publishDroneDetected } from '../../lib/droneDetectionHub';
import { resolveTrendsTemplatesForAnalysis } from '../../lib/droneTightCalibration';
import { buildTrendsFftReport } from './buildTrendsFftReport';
import {
  registerTrendsFftController,
  trendsFftPluginState,
  type TrendsTickState,
} from './trendsFftPluginState';
import {
  logTrendsFftResult,
  logTrendsFftStreamStart,
  logTrendsFftStreamStop,
} from './trendsFftTelemetry';
import {
  TRENDS_FFT_ANALYZER_PLUGIN_ID,
  defaultTrendsFftAnalyzerConfig,
  resolveTrendsFftAnalyzerConfig,
  type TrendsFftAnalyzerPluginConfig,
  type TrendsDetectionMode,
} from './types';
import { userTemplatesStore } from './userTemplatesStore';

const FFT_SIZE = 2048;
const SMOOTHING = 0.8;
const TELEMETRY_MIN_INTERVAL_MS = 5000;

function newReportId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `trends-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readPluginConfig(moduleId: string): TrendsFftAnalyzerPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, TRENDS_FFT_ANALYZER_PLUGIN_ID)?.config;
  return resolveTrendsFftAnalyzerConfig(raw ?? defaultTrendsFftAnalyzerConfig);
}

function syncStateFromConfig(config: TrendsFftAnalyzerPluginConfig): void {
  trendsFftPluginState.syncConfig({
    mode: config.detectionMode,
    measurementsCount: config.measurementsCount,
    intervalMs: config.intervalMs,
    minRms: config.minRms,
  });
}

export function createTrendsFftAnalyzerPlugin(): Plugin<TrendsFftAnalyzerPluginConfig> {
  return {
    id: TRENDS_FFT_ANALYZER_PLUGIN_ID,
    name: 'Анализатор тенденций FFT',
    description:
      'Классификация акустических сцен по серии FFT-метрик (ветер, тишина, трафик, дрон и др.)',
    version: '1.0.0',
    active: false,
    config: { ...defaultTrendsFftAnalyzerConfig },
    install(context: ModuleContext<TrendsFftAnalyzerPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let feed: AudioFrameFeed | null = null;
      let unsubFeed: (() => void) | null = null;
      let feedActive = false;
      let autoRestartTimer: ReturnType<typeof setTimeout> | null = null;
      let sampleIntervalTimer: ReturnType<typeof setInterval> | null = null;
      let collectionActive = false;
      let collectedSamples: MetricSample[] = [];
      let collectionStartedAt = 0;
      let reportId = '';
      let lastAudioFrame: AudioSampleFrame | null = null;
      let collectionFluxTracker: SpectralFluxTracker | null = null;
      let lastTelemetryAt = 0;
      let mountedDetectionMode: TrendsDetectionMode =
        readPluginConfig(moduleId).detectionMode;

      const analyzer = new FftAnalyzer(
        applyPreset({
          ...PRESETS.drone,
          fftSize: FFT_SIZE,
          smoothingTimeConstant: SMOOTHING,
        }),
      );

      const clearAutoRestart = (): void => {
        if (autoRestartTimer !== null) {
          clearTimeout(autoRestartTimer);
          autoRestartTimer = null;
        }
      };

      const stopSampleInterval = (): void => {
        if (sampleIntervalTimer !== null) {
          clearInterval(sampleIntervalTimer);
          sampleIntervalTimer = null;
        }
      };

      const buildTickStates = (
        count: number,
        target: number,
      ): TrendsTickState[] => {
        const states: TrendsTickState[] = Array.from({ length: target }, () => 'pending');
        for (let i = 0; i < count; i++) {
          states[i] = 'collected';
        }
        return states;
      };

      const abortCollection = (): void => {
        stopSampleInterval();
        clearAutoRestart();
        collectionActive = false;
        collectedSamples = [];
        collectionFluxTracker = null;
        const config = readPluginConfig(moduleId);
        trendsFftPluginState.abortCollection(config.measurementsCount);
      };

      const stopFeed = async (): Promise<void> => {
        abortCollection();
        feedActive = false;
        if (feed) {
          await feed.stop();
        }
        trendsFftPluginState.setLive(false);
      };

      const finishCollection = (): void => {
        if (!collectionActive) return;
        const config = readPluginConfig(moduleId);
        if (collectedSamples.length < config.measurementsCount) return;

        stopSampleInterval();
        collectionActive = false;
        const finishedAt = Date.now();
        const templates = resolveTrendsTemplatesForAnalysis(
          userTemplatesStore.getTemplates(),
          config.enabledTemplateKeys,
        );
        const result = classifyTrends(collectedSamples, templates, {
          minConfidence: config.minConfidence,
          activityRmsThreshold: config.minRms,
        });

        trendsFftPluginState.updateCollecting({
          collectedCount: collectedSamples.length,
          tickStates: buildTickStates(collectedSamples.length, config.measurementsCount),
          currentSample: null,
        });
        trendsFftPluginState.finishCollection(result);

        const shouldLog =
          result.isDetected ||
          finishedAt - lastTelemetryAt >= TELEMETRY_MIN_INTERVAL_MS;

        if (shouldLog) {
          lastTelemetryAt = finishedAt;
          const report = buildTrendsFftReport({
            reportId,
            startedAt: collectionStartedAt,
            finishedAt,
            intervalMs: config.intervalMs,
            measurementsCount: config.measurementsCount,
            mode: config.detectionMode,
            result,
          });
          logTrendsFftResult(moduleId, report);
          if (result.isDetected) {
            publishDroneDetected({
              sourceId: 'trends-fft-analyzer',
              sourceLabel: 'Анализатор тенденций FFT',
              timestamp: finishedAt,
            });
          }
        }

        collectionFluxTracker = null;
        collectedSamples = [];

        if (config.detectionMode === 'auto' && !disposed && feedActive) {
          clearAutoRestart();
          const delayMs = Math.max(0, config.autoRestartDelayMs);
          autoRestartTimer = setTimeout(() => {
            if (disposed || !feedActive) return;
            const latest = readPluginConfig(moduleId);
            if (latest.detectionMode !== 'auto') return;
            beginCollection();
          }, delayMs);
        }
      };

      const collectScheduledSample = (): void => {
        if (!collectionActive || disposed || !collectionFluxTracker) return;

        const config = readPluginConfig(moduleId);
        const frame = lastAudioFrame;
        const timestamp = Date.now();

        let centroid = 0;
        let flux = 0;
        let sampleRms = 0;

        if (frame) {
          const live = analyzer.analyzeFrame(frame, collectionFluxTracker);
          centroid = live.centroid;
          flux = live.flux;
          sampleRms = rms(frame.samples);
        }

        const sample: MetricSample = {
          timestamp,
          centroid,
          flux,
          rms: sampleRms,
        };
        collectedSamples.push(sample);

        const ticks = buildTickStates(collectedSamples.length, config.measurementsCount);
        trendsFftPluginState.updateCollecting({
          collectedCount: collectedSamples.length,
          tickStates: ticks,
          currentSample: {
            centroid: sample.centroid,
            flux: sample.flux,
            rms: sample.rms,
          },
        });

        if (collectedSamples.length >= config.measurementsCount) {
          finishCollection();
        }
      };

      const startSampleInterval = (): void => {
        stopSampleInterval();
        const config = readPluginConfig(moduleId);
        sampleIntervalTimer = setInterval(() => {
          collectScheduledSample();
        }, config.intervalMs);
      };

      const beginCollection = (): void => {
        if (disposed || !feedActive) return;
        const config = readPluginConfig(moduleId);
        syncStateFromConfig(config);
        stopSampleInterval();
        clearAutoRestart();
        collectionActive = true;
        collectedSamples = [];
        collectionStartedAt = Date.now();
        reportId = newReportId();
        collectionFluxTracker = new SpectralFluxTracker();
        trendsFftPluginState.beginCollection(config.measurementsCount);
        collectScheduledSample();
        startSampleInterval();
      };

      const handleAudioFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !feedActive) return;
        lastAudioFrame = frame;
      };

      const handleFeedStopped = (): void => {
        feedActive = false;
        abortCollection();
        trendsFftPluginState.setLive(false);
      };

      const mountFeed = (): void => {
        unsubFeed?.();
        void stopFeed().then(() => {
          if (disposed) return;
          const config = readPluginConfig(moduleId);
          syncStateFromConfig(config);
          analyzer.resetState();
          lastAudioFrame = null;

          feed = createAnalysisFrameFeed({
            analysisSource: 'microphone',
            moduleId,
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING,
            onStart: () => {
              if (disposed) return;
              feedActive = true;
              trendsFftPluginState.setLive(true);
              logTrendsFftStreamStart(moduleId);
              const latest = readPluginConfig(moduleId);
              if (latest.detectionMode === 'auto') {
                beginCollection();
              }
            },
            onStop: () => {
              logTrendsFftStreamStop(moduleId);
              handleFeedStopped();
            },
            onError: () => {
              handleFeedStopped();
            },
          });

          unsubFeed = feed.subscribe(handleAudioFrame);
          void feed.start();
        });
      };

      registerTrendsFftController({
        startManualCollection: () => {
          if (disposed || !feedActive) return;
          const config = readPluginConfig(moduleId);
          if (config.detectionMode !== 'manual') return;
          if (collectionActive) return;
          beginCollection();
        },
        stopCollection: () => {
          if (!collectionActive) return;
          abortCollection();
        },
      });

      const unsubStore = useMembranaStore.subscribe(() => {
        if (disposed) return;
        const nextMode = readPluginConfig(moduleId).detectionMode;
        if (nextMode === mountedDetectionMode) return;

        const wasManual = mountedDetectionMode === 'manual';
        mountedDetectionMode = nextMode;

        if (nextMode === 'manual' && collectionActive) {
          abortCollection();
          return;
        }

        if (nextMode === 'auto' && wasManual && feedActive && !collectionActive) {
          beginCollection();
        }
      });

      mountFeed();

      return (): Promise<void> => {
        disposed = true;
        unsubStore();
        registerTrendsFftController(null);
        unsubFeed?.();
        unsubFeed = null;
        return stopFeed().then(() => {
          feed = null;
          trendsFftPluginState.reset();
        });
      };
    },
  };
}
