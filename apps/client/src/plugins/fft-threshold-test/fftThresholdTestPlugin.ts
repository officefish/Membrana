import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import { LiveSampler, type AudioSampleFrame } from '@membrana/audio-engine-service';
import {
  FftAnalyzer,
  SpectralFluxTracker,
  applyPreset,
  evaluateFrameVerdict,
  evaluateThresholdTest,
  PRESETS,
  rms,
  type FrameVerdict,
  type LiveFrameResult,
} from '@membrana/fft-analyzer-service';

import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';

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
  resolveFftThresholdTestConfig,
  type FftThresholdTestPluginConfig,
} from './types';

const FFT_SIZE = 2048;
/** Меньше сглаживание AnalyserNode — быстрее реагирует на фон/речь в офисе. */
/** Как FFT_CONFIG.SMOOTHING_TIME_CONSTANT в three-param-analyzer. */
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
      let currentSampler: LiveSampler | null = null;
      let autoRestartTimer: ReturnType<typeof setTimeout> | null = null;
      let collectionActive = false;
      let collectingFrames: FrameVerdict[] = [];
      let testStartedAt = 0;
      let testId = '';
      let lastSampleAt = 0;
      let lastAudioFrame: AudioSampleFrame | null = null;
      let lastLiveMetrics: LiveFrameResult | null = null;
      /** Flux только между замерами теста (intervalMs), не между RAF-кадрами. */
      let collectionFluxTracker: SpectralFluxTracker | null = null;

      const analyzer = new FftAnalyzer(
        applyPreset({
          ...PRESETS.drone,
          fftSize: FFT_SIZE,
          smoothingTimeConstant: SMOOTHING,
          liveMode: { intervalMs: 500 },
        }),
      );

      const clearAutoRestart = (): void => {
        if (autoRestartTimer !== null) {
          clearTimeout(autoRestartTimer);
          autoRestartTimer = null;
        }
      };

      const stopSampler = (): Promise<void> => {
        clearAutoRestart();
        collectionActive = false;
        collectingFrames = [];
        collectionFluxTracker = null;
        const s = currentSampler;
        currentSampler = null;
        fftThresholdPluginState.setLive(false);
        return s ? s.stop() : Promise.resolve();
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

        if (config.mode === 'auto' && !disposed && currentSampler) {
          clearAutoRestart();
          autoRestartTimer = setTimeout(() => {
            if (!disposed && currentSampler) {
              beginCollection();
            }
          }, config.autoRestartDelayMs);
        }
      };

      const beginCollection = (): void => {
        if (disposed || !currentSampler) return;
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
        lastLiveMetrics = analyzer.analyzeFrame(frame);
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
        if (disposed || !currentSampler) return;
        processLiveFrame(frame);
        const config = readPluginConfig(moduleId);
        if (config.mode === 'auto' && !collectionActive && currentSampler) {
          beginCollection();
        }
        if (collectionActive) {
          trySampleFrame();
        }
      };

      registerFftThresholdTestController({
        startManualTest: () => {
          if (disposed || !currentSampler) return;
          const config = readPluginConfig(moduleId);
          if (config.mode !== 'manual') return;
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

      syncStateFromConfig(readPluginConfig(moduleId));

      const unlisten = subscribeMicrophoneStream(moduleId, (stream) => {
        void stopSampler().then(() => {
          if (disposed) return;
          if (!stream || stream.getAudioTracks().length === 0) {
            fftThresholdPluginState.reset();
            return;
          }

          const sampler = new LiveSampler({
            bufferSize: FFT_SIZE,
            smoothingTimeConstant: SMOOTHING,
          });
          currentSampler = sampler;
          analyzer.resetState();

          sampler.on('frame', handleAudioFrame);
          sampler.on('start', () => {
            if (disposed) return;
            fftThresholdPluginState.setLive(true);
            logFftThresholdStreamStart(moduleId);
            const config = readPluginConfig(moduleId);
            if (config.mode === 'auto') {
              beginCollection();
            }
          });
          sampler.on('stop', () => {
            fftThresholdPluginState.setLive(false);
            collectionActive = false;
            clearAutoRestart();
            logFftThresholdStreamStop(moduleId);
          });
          sampler.on('error', () => {
            fftThresholdPluginState.setLive(false);
            collectionActive = false;
            clearAutoRestart();
          });

          void sampler.start(stream).catch(() => undefined);
        });
      });

      return (): Promise<void> => {
        disposed = true;
        registerFftThresholdTestController(null);
        unlisten();
        clearAutoRestart();
        return stopSampler().then(() => {
          fftThresholdPluginState.reset();
          fftThresholdReportHistory.clear();
        });
      };
    },
  };
}
