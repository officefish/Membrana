import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import type { AudioSampleFrame } from '@membrana/audio-engine-service';
import {
  FftAnalyzer,
  SpectralFluxTracker,
  applyPreset,
  DEFAULT_CONFIG,
  evaluateFrameVerdict,
  evaluateThresholdTest,
  PRESETS,
  rms,
  type FrameVerdict,
  type LiveFrameResult,
} from '@membrana/fft-analyzer-service';

import { publishDroneDetected } from '../../lib/droneDetectionHub';
import {
  createAnalysisFrameFeed,
  type AudioFrameFeed,
} from '../../lib/audioAnalysis';

import {
  fftThresholdPluginState,
  registerFftThresholdTestController,
  verdictsToTickStates,
  type FrameTickState as UiTickState,
} from './fftThresholdPluginState';
import { buildFftThresholdTestReport } from './buildFftThresholdTestReport';
import { fftThresholdReportHistory } from './fftThresholdReportHistory';
import {
  logFftThresholdStreamStart,
  logFftThresholdStreamStop,
  logFftThresholdTestResult,
} from './fftThresholdTelemetry';
import {
  FFT_THRESHOLD_TEST_PLUGIN_ID,
  defaultFftThresholdTestConfig,
  fftThresholdDroneSourceId,
  resolveFftThresholdTestConfig,
  type FftThresholdTestPluginConfig,
} from './types';

const FFT_SIZE = 2048;
const SMOOTHING = 0.5;

function metricsForVerdict(
  live: LiveFrameResult,
  samples: Float32Array,
): { centroid: number; flux: number; rms: number } {
  return {
    centroid: live.centroid,
    flux: live.flux,
    rms: rms(samples),
  };
}

function newTestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `fft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readPluginConfig(moduleId: string): FftThresholdTestPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, FFT_THRESHOLD_TEST_PLUGIN_ID)?.config;
  return resolveFftThresholdTestConfig(raw ?? defaultFftThresholdTestConfig);
}

function syncStateFromConfig(config: FftThresholdTestPluginConfig): void {
  fftThresholdPluginState.syncConfig({
    mode: config.mode,
    frameCount: config.frameCount,
    strictness: config.strictness,
    thresholds: config.thresholds,
    intervalMs: config.intervalMs,
  });
}

export function createFftThresholdTestPlugin(): Plugin<FftThresholdTestPluginConfig> {
  return {
    id: FFT_THRESHOLD_TEST_PLUGIN_ID,
    name: 'FFT пороговый тест',
    description:
      'Серия кадров FFT (центроид, поток, RMS) с порогами и уровнем строгости; отчёт в телеметрию',
    version: '1.0.0',
    active: false,
    config: { ...defaultFftThresholdTestConfig },
    install(context: ModuleContext<FftThresholdTestPluginConfig>): PluginTeardown {
      const { moduleId } = context;
      let disposed = false;
      let feed: AudioFrameFeed | null = null;
      let unsubFeed: (() => void) | null = null;
      let feedActive = false;
      let autoRestartTimer: ReturnType<typeof setTimeout> | null = null;
      let collectionActive = false;
      let collectingFrames: FrameVerdict[] = [];
      let testStartedAt = 0;
      let testId = '';
      let lastSampleAt = 0;
      let lastAudioFrame: AudioSampleFrame | null = null;
      let collectionFluxTracker: SpectralFluxTracker | null = null;
      let pendingManualSampleScan = false;
      let mountedAnalysisSource = readPluginConfig(moduleId).analysisSource;

      const analyzer = new FftAnalyzer(
        applyPreset({
          ...PRESETS.drone,
          fftSize: FFT_SIZE,
          smoothingTimeConstant: SMOOTHING,
          liveMode: {
            intervalMs: 500,
            minRMS: DEFAULT_CONFIG.liveMode.minRMS,
            frequencyRange: DEFAULT_CONFIG.liveMode.frequencyRange,
          },
        }),
      );

      const clearAutoRestart = (): void => {
        if (autoRestartTimer !== null) {
          clearTimeout(autoRestartTimer);
          autoRestartTimer = null;
        }
      };

      const stopFeed = async (): Promise<void> => {
        clearAutoRestart();
        collectionActive = false;
        collectingFrames = [];
        collectionFluxTracker = null;
        feedActive = false;
        if (feed) {
          await feed.stop();
        }
        fftThresholdPluginState.setLive(false);
      };

      const buildTickStates = (
        frames: readonly FrameVerdict[],
        targetCount: number,
      ): UiTickState[] => {
        const states: UiTickState[] = Array.from({ length: targetCount }, () => 'pending');
        for (let i = 0; i < frames.length; i++) {
          states[i] = frames[i]!.framePassed ? 'passed' : 'failed';
        }
        return states;
      };

      const restartSampleScan = (manual = false): void => {
        const config = readPluginConfig(moduleId);
        if (config.analysisSource !== 'sample-library' || !feed) return;
        pendingManualSampleScan = manual;
        void feed.stop().then(() => {
          if (!disposed) void feed?.start();
        });
      };

      const finishCollection = (): void => {
        if (!collectionActive || collectingFrames.length === 0) return;
        collectionActive = false;
        const config = readPluginConfig(moduleId);
        const finishedAt = Date.now();
        const result = evaluateThresholdTest({
          frames: collectingFrames,
          strictness: config.strictness,
          frameCount: config.frameCount,
          thresholds: config.thresholds,
          intervalMs: config.intervalMs,
          mode: config.mode,
          testId,
          startedAt: testStartedAt,
          finishedAt,
        });
        const ticks = verdictsToTickStates(result.frames);
        const report = buildFftThresholdTestReport(result);
        fftThresholdReportHistory.push(report);
        fftThresholdPluginState.finishTest(result, ticks);
        logFftThresholdTestResult(moduleId, report);

        if (result.isDetected) {
          publishDroneDetected({
            sourceId: fftThresholdDroneSourceId(config.analysisSource),
            sourceLabel: 'FFT пороговый тест',
            timestamp: finishedAt,
          });
        }

        if (config.mode === 'auto' && !disposed && feedActive) {
          clearAutoRestart();
          autoRestartTimer = setTimeout(() => {
            if (disposed || !feedActive) return;
            if (config.analysisSource === 'sample-library') {
              restartSampleScan();
              return;
            }
            beginCollection();
          }, config.autoRestartDelayMs);
        }
      };

      const beginCollection = (): void => {
        if (disposed || !feedActive) return;
        const config = readPluginConfig(moduleId);
        syncStateFromConfig(config);
        clearAutoRestart();
        collectionActive = true;
        collectingFrames = [];
        testStartedAt = Date.now();
        testId = newTestId();
        lastSampleAt = 0;
        collectionFluxTracker = new SpectralFluxTracker();
        fftThresholdPluginState.beginCollection(config.frameCount);
      };

      const processLiveFrame = (frame: AudioSampleFrame): void => {
        lastAudioFrame = frame;
        analyzer.analyzeFrame(frame);
      };

      const trySampleFrame = (): void => {
        if (
          !collectionActive ||
          disposed ||
          !lastAudioFrame ||
          !collectionFluxTracker
        ) {
          return;
        }
        const config = readPluginConfig(moduleId);
        const now = lastAudioFrame.timestamp;
        if (
          collectingFrames.length > 0 &&
          now - lastSampleAt < config.intervalMs
        ) {
          return;
        }
        lastSampleAt = now;

        const sampleMetrics = analyzer.analyzeFrame(
          lastAudioFrame,
          collectionFluxTracker,
        );
        const partial = evaluateFrameVerdict(
          metricsForVerdict(sampleMetrics, lastAudioFrame.samples),
          config.thresholds,
          config.strictness,
        );
        const verdict: FrameVerdict = {
          index: collectingFrames.length,
          timestamp: now,
          ...partial,
        };
        collectingFrames.push(verdict);

        const ticks = buildTickStates(collectingFrames, config.frameCount);
        fftThresholdPluginState.updateCollecting({
          collectedCount: collectingFrames.length,
          tickStates: ticks,
          currentFrame: {
            centroid: verdict.centroid,
            flux: verdict.flux,
            rms: verdict.rms,
            centroidOk: verdict.centroidInRange,
            fluxOk: verdict.fluxInRange,
            rmsOk: verdict.rmsInRange,
          },
        });

        if (collectingFrames.length >= config.frameCount) {
          finishCollection();
        }
      };

      const handleAudioFrame = (frame: AudioSampleFrame): void => {
        if (disposed || !feedActive) return;
        processLiveFrame(frame);
        const config = readPluginConfig(moduleId);
        if (config.mode === 'auto' && !collectionActive && feedActive) {
          beginCollection();
        }
        if (collectionActive) {
          trySampleFrame();
        }
      };

      const mountFeed = (): void => {
        unsubFeed?.();
        void stopFeed().then(() => {
          if (disposed) return;
          const config = readPluginConfig(moduleId);
          syncStateFromConfig(config);
          analyzer.resetState();

          feed = createAnalysisFrameFeed({
            analysisSource: config.analysisSource,
            moduleId,
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING,
            timestampStepMs:
              config.analysisSource === 'sample-library' ? config.intervalMs : undefined,
            onStart: () => {
              if (disposed) return;
              feedActive = true;
              fftThresholdPluginState.setLive(true);
              logFftThresholdStreamStart(moduleId);
              const latest = readPluginConfig(moduleId);
              if (latest.mode === 'auto' || pendingManualSampleScan) {
                pendingManualSampleScan = false;
                beginCollection();
              }
            },
            onStop: () => {
              feedActive = false;
              collectionActive = false;
              clearAutoRestart();
              fftThresholdPluginState.setLive(false);
              logFftThresholdStreamStop(moduleId);
            },
            onError: () => {
              feedActive = false;
              collectionActive = false;
              clearAutoRestart();
              fftThresholdPluginState.setLive(false);
            },
          });

          unsubFeed = feed.subscribe(handleAudioFrame);
          void feed.start();
        });
      };

      registerFftThresholdTestController({
        startManualTest: () => {
          if (disposed || !feedActive) return;
          const config = readPluginConfig(moduleId);
          if (config.mode !== 'manual') return;
          if (config.analysisSource === 'sample-library') {
            restartSampleScan(true);
            return;
          }
          beginCollection();
        },
        stopTest: () => {
          if (!collectionActive) return;
          collectionActive = false;
          collectingFrames = [];
          collectionFluxTracker = null;
          clearAutoRestart();
          const config = readPluginConfig(moduleId);
          fftThresholdPluginState.resetToIdle(config.frameCount);
        },
      });

      mountFeed();

      const unsubStore = useMembranaStore.subscribe(() => {
        const nextSource = readPluginConfig(moduleId).analysisSource;
        if (nextSource === mountedAnalysisSource) return;
        mountedAnalysisSource = nextSource;
        mountFeed();
      });

      return (): Promise<void> => {
        disposed = true;
        unsubStore();
        registerFftThresholdTestController(null);
        unsubFeed?.();
        unsubFeed = null;
        clearAutoRestart();
        return stopFeed().then(() => {
          feed = null;
          fftThresholdPluginState.reset();
          fftThresholdReportHistory.clear();
        });
      };
    },
  };
}
