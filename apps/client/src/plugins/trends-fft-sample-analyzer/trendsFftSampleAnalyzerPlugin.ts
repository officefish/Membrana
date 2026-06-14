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
  resolveTemplates,
  type MetricSample,
} from '@membrana/trends-detector-service';

import { createBufferFrameFeed, type AudioFrameFeed } from '../../lib/audioAnalysis';
import {
  getSamplePlaybackSnapshot,
  loadSampleBufferById,
  restartSamplePlayback,
  subscribeSamplePlayback,
} from '../../lib/sampleLibraryPlaybackHub';
import { userTemplatesStore } from '../trends-fft-analyzer/userTemplatesStore';
import { resolveSampleDurationPlan } from './sampleDurationPolicy';
import {
  registerTrendsFftSampleController,
  trendsFftSamplePluginState,
  type TrendsFftSampleSnapshot,
} from './trendsFftSamplePluginState';
import {
  defaultTrendsFftSampleAnalyzerConfig,
  resolveTrendsFftSampleAnalyzerConfig,
  TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID,
  type TrendsFftSampleAnalyzerPluginConfig,
} from './types';

const FFT_SIZE = 2048;
const SMOOTHING = 0.8;

function readPluginConfig(moduleId: string): TrendsFftSampleAnalyzerPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID)?.config;
  return resolveTrendsFftSampleAnalyzerConfig(raw ?? defaultTrendsFftSampleAnalyzerConfig);
}

function syncSampleContextFromHub(config: TrendsFftSampleAnalyzerPluginConfig): {
  blockedReason: string | null;
  effectiveMeasurementsCount: number;
  analysisSegmentSec: number;
} {
  const hub = getSamplePlaybackSnapshot();
  if (!hub.selectedSampleId) {
    trendsFftSamplePluginState.setSampleContext({
      selectedSampleId: null,
      selectedSampleTitle: null,
      durationPlan: null,
      blockedReason: 'Выберите сэмпл в таблице библиотеки.',
      ready: false,
    });
    return { blockedReason: 'no-sample', effectiveMeasurementsCount: 0, analysisSegmentSec: 0 };
  }

  if (hub.durationSec <= 0) {
    trendsFftSamplePluginState.setSampleContext({
      selectedSampleId: hub.selectedSampleId,
      selectedSampleTitle: hub.selectedTitle,
      durationPlan: null,
      blockedReason: null,
      ready: false,
    });
    return { blockedReason: 'loading', effectiveMeasurementsCount: 0, analysisSegmentSec: 0 };
  }

  const duration = hub.durationSec;
  const resolved = resolveSampleDurationPlan(
    duration,
    config.measurementsCount,
    config.intervalMs,
  );

  if (resolved.kind === 'blocked') {
    trendsFftSamplePluginState.setSampleContext({
      selectedSampleId: hub.selectedSampleId,
      selectedSampleTitle: hub.selectedTitle,
      durationPlan: null,
      blockedReason: resolved.reason,
      ready: false,
    });
    return {
      blockedReason: resolved.reason,
      effectiveMeasurementsCount: 0,
      analysisSegmentSec: 0,
    };
  }

  trendsFftSamplePluginState.setSampleContext({
    selectedSampleId: hub.selectedSampleId,
    selectedSampleTitle: hub.selectedTitle,
    durationPlan: resolved.plan,
    blockedReason: null,
    ready: true,
  });

  return {
    blockedReason: null,
    effectiveMeasurementsCount: resolved.plan.effectiveMeasurementsCount,
    analysisSegmentSec: resolved.plan.analysisSegmentSec,
  };
}

export function createTrendsFftSampleAnalyzerPlugin(): Plugin<TrendsFftSampleAnalyzerPluginConfig> {
  return {
    id: TRENDS_FFT_SAMPLE_ANALYZER_PLUGIN_ID,
    name: 'Анализатор тенденций FFT (сэмпл)',
    description:
      'Классификация выбранного сэмпла библиотеки по FFT-трендам и шаблонам сцен (offline)',
    version: '1.0.0',
    active: false,
    config: { ...defaultTrendsFftSampleAnalyzerConfig },
    install(context: ModuleContext<TrendsFftSampleAnalyzerPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let feed: AudioFrameFeed | null = null;
      let unsubFeed: (() => void) | null = null;
      let unsubHub: (() => void) | null = null;
      let feedActive = false;
      let collectionActive = false;
      let collectedSamples: MetricSample[] = [];
      let lastAudioFrame: AudioSampleFrame | null = null;
      let lastSampleAt = 0;
      let collectionFluxTracker: SpectralFluxTracker | null = null;
      let effectiveMeasurementsCount = 0;

      const analyzer = new FftAnalyzer(
        applyPreset({
          ...PRESETS.drone,
          fftSize: FFT_SIZE,
          smoothingTimeConstant: SMOOTHING,
        }),
      );

      const buildTickStates = (count: number, target: number): TrendsFftSampleSnapshot['tickStates'] => {
        const states: ('pending' | 'collected')[] = Array.from({ length: target }, () => 'pending');
        for (let i = 0; i < count; i++) states[i] = 'collected';
        return states;
      };

      const abortCollection = (): void => {
        collectionActive = false;
        collectedSamples = [];
        collectionFluxTracker = null;
        const config = readPluginConfig(moduleId);
        trendsFftSamplePluginState.abortCollection(
          effectiveMeasurementsCount || config.measurementsCount,
        );
      };

      const teardownFeed = async (): Promise<void> => {
        feedActive = false;
        unsubFeed?.();
        unsubFeed = null;
        if (feed) {
          await feed.stop();
          feed = null;
        }
      };

      const finishCollection = (): void => {
        if (!collectionActive) return;
        const config = readPluginConfig(moduleId);
        if (collectedSamples.length < effectiveMeasurementsCount) return;

        collectionActive = false;
        const templates = resolveTemplates(
          config.enabledTemplateKeys,
          userTemplatesStore.getTemplates(),
        );
        const result = classifyTrends(collectedSamples, templates, {
          minConfidence: config.minConfidence,
          activityRmsThreshold: config.minRms,
        });

        trendsFftSamplePluginState.updateCollecting({
          collectedCount: collectedSamples.length,
          tickStates: buildTickStates(collectedSamples.length, effectiveMeasurementsCount),
          currentSample: null,
        });
        trendsFftSamplePluginState.finishCollection(result, {
          measurementsCount: config.measurementsCount,
          intervalMs: config.intervalMs,
        });
        collectionFluxTracker = null;
        collectedSamples = [];
        void teardownFeed();
      };

      const trySampleFrame = (): void => {
        if (!collectionActive || disposed || !lastAudioFrame || !collectionFluxTracker) return;

        const config = readPluginConfig(moduleId);
        const timestamp = lastAudioFrame.timestamp;
        if (collectedSamples.length > 0 && timestamp - lastSampleAt < config.intervalMs) {
          return;
        }
        lastSampleAt = timestamp;

        const live = analyzer.analyzeFrame(lastAudioFrame, collectionFluxTracker);
        const sample: MetricSample = {
          timestamp,
          centroid: live.centroid,
          flux: live.flux,
          rms: rms(lastAudioFrame.samples),
        };
        collectedSamples.push(sample);

        trendsFftSamplePluginState.updateCollecting({
          collectedCount: collectedSamples.length,
          tickStates: buildTickStates(collectedSamples.length, effectiveMeasurementsCount),
          currentSample: {
            centroid: sample.centroid,
            flux: sample.flux,
            rms: sample.rms,
          },
        });

        if (collectedSamples.length >= effectiveMeasurementsCount) {
          finishCollection();
        }
      };

      const beginCollection = (): void => {
        if (disposed) return;
        const config = readPluginConfig(moduleId);
        const plan = syncSampleContextFromHub(config);
        if (plan.blockedReason || plan.effectiveMeasurementsCount <= 0) return;

        effectiveMeasurementsCount = plan.effectiveMeasurementsCount;
        trendsFftSamplePluginState.syncConfig({
          measurementsCount: effectiveMeasurementsCount,
          intervalMs: config.intervalMs,
          minRms: config.minRms,
        });

        collectionActive = true;
        collectedSamples = [];
        lastSampleAt = 0;
        collectionFluxTracker = new SpectralFluxTracker();
        trendsFftSamplePluginState.beginCollection(effectiveMeasurementsCount);
      };

      const handleAudioFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !feedActive) return;
        lastAudioFrame = frame;
        if (collectionActive) trySampleFrame();
      };

      const startAnalysis = (): void => {
        if (disposed || collectionActive || feedActive) return;

        const config = readPluginConfig(moduleId);
        const hub = getSamplePlaybackSnapshot();
        const sampleId = hub.selectedSampleId;
        if (!sampleId) return;

        const plan = syncSampleContextFromHub(config);
        if (
          plan.blockedReason === 'no-sample' ||
          plan.blockedReason === 'loading' ||
          plan.effectiveMeasurementsCount <= 0
        ) {
          return;
        }

        effectiveMeasurementsCount = plan.effectiveMeasurementsCount;

        void (async () => {
          await teardownFeed();
          if (disposed) return;

          void restartSamplePlayback();

          try {
            const buffer = await loadSampleBufferById(sampleId);
            if (disposed) return;

            analyzer.resetState();
            lastAudioFrame = null;

            const maxAnalysisDurationSec =
              plan.analysisSegmentSec > 0 ? plan.analysisSegmentSec : undefined;

            feed = createBufferFrameFeed({
              buffer,
              bufferSize: FFT_SIZE,
              smoothingTimeConstant: SMOOTHING,
              timestampStepMs: config.intervalMs,
              emitIntervalMs: config.intervalMs,
              maxAnalysisDurationSec,
              onStart: () => {
                if (disposed) return;
                feedActive = true;
                beginCollection();
              },
              onStop: () => {
                feedActive = false;
                if (collectionActive) {
                  abortCollection();
                }
              },
              onError: () => {
                feedActive = false;
                abortCollection();
              },
            });

            unsubFeed = feed.subscribe(handleAudioFrame);
            await feed.start();
          } catch {
            feedActive = false;
            abortCollection();
          }
        })();
      };

      registerTrendsFftSampleController({
        startAnalysis,
      });

      let watchedSampleId = getSamplePlaybackSnapshot().selectedSampleId;

      unsubHub = subscribeSamplePlayback(() => {
        if (disposed) return;
        const hub = getSamplePlaybackSnapshot();
        const sampleChanged = hub.selectedSampleId !== watchedSampleId;
        watchedSampleId = hub.selectedSampleId;
        syncSampleContextFromHub(readPluginConfig(moduleId));
        if (sampleChanged && (collectionActive || feedActive)) {
          abortCollection();
          void teardownFeed();
        }
      });

      const unsubStore = useMembranaStore.subscribe(() => {
        if (disposed) return;
        const config = readPluginConfig(moduleId);
        syncSampleContextFromHub(config);
        if (
          trendsFftSamplePluginState.shouldRestartForParams(
            config.measurementsCount,
            config.intervalMs,
          ) &&
          !collectionActive &&
          !feedActive
        ) {
          trendsFftSamplePluginState.invalidateResult(config.measurementsCount);
          startAnalysis();
        }
      });

      syncSampleContextFromHub(readPluginConfig(moduleId));

      return (): Promise<void> => {
        disposed = true;
        unsubStore();
        unsubHub?.();
        unsubHub = null;
        registerTrendsFftSampleController(null);
        return teardownFeed().then(() => {
          trendsFftSamplePluginState.reset();
        });
      };
    },
  };
}
