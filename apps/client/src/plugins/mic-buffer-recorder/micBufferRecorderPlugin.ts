import type { ModuleContext, Plugin, PluginTeardown } from '@membrana/agenda';
import { useMembranaStore } from '@membrana/agenda';
import type {
  MediaLibraryCaptureFormat,
  MediaLibraryRecordingMode,
} from '@membrana/media-library-service';

import {
  publishMediaLibraryCaptureCancel,
  publishMediaLibraryCaptureStart,
  publishMediaLibraryCaptureStop,
  subscribeMediaLibraryBufferCleared,
  subscribeMediaLibraryQuotaUpdated,
} from '../../lib/mediaLibraryHub';
import { publishMediaLibraryQuotaFromService } from '../../lib/mediaLibraryHubBridge';
import { subscribeMicrophoneStream } from '../../modules/microphone/microphoneStreamHub';

import { startClipRecorder, type ActiveClipRecorder } from './clipRecorder';
import {
  micBufferRecorderPluginState,
  registerMicBufferRecorderController,
  type MicBufferRecorderController,
} from './micBufferRecorderPluginState';
import { clampManualTargetSec, pickFallbackCaptureFormat } from './recordingUtils';
import {
  MIC_BUFFER_RECORDER_PLUGIN_ID,
  defaultMicBufferRecorderConfig,
  resolveMicBufferRecorderConfig,
  type MicBufferRecorderPluginConfig,
} from './types';

function buildSampleTitle(mode: MediaLibraryRecordingMode, format: MediaLibraryCaptureFormat): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `mic-${mode}-${format}-${stamp}`;
}

function readPluginConfig(moduleId: string): MicBufferRecorderPluginConfig {
  const raw = useMembranaStore
    .getState()
    .getPlugin(moduleId, MIC_BUFFER_RECORDER_PLUGIN_ID)?.config;
  return resolveMicBufferRecorderConfig(raw);
}

function syncStateFromConfig(
  moduleId: string,
  mode: MediaLibraryRecordingMode,
): void {
  const cfg = readPluginConfig(moduleId);
  micBufferRecorderPluginState.syncConfig({
    mode,
    format: cfg.defaultFormat,
    manualPresetSec: cfg.manualPresetSec,
    autoSegmentSec: cfg.autoSegmentSec,
    pauseSec: cfg.pauseSec,
    effectiveFormat: pickFallbackCaptureFormat(cfg.defaultFormat),
  });
}

export function createMicBufferRecorderPlugin(): Plugin<MicBufferRecorderPluginConfig> {
  return {
    id: MIC_BUFFER_RECORDER_PLUGIN_ID,
    name: 'Запись в буфер',
    description: 'Ручная и автоматическая запись клипов с микрофона в буфер библиотеки сэмплов',
    version: '0.1.0',
    active: false,
    config: { ...defaultMicBufferRecorderConfig },
    install(context: ModuleContext<MicBufferRecorderPluginConfig>): PluginTeardown {
      let disposed = false;
      let currentStream: MediaStream | null = null;
      let activeRecorder: ActiveClipRecorder | null = null;
      let progressTimerId: ReturnType<typeof setInterval> | null = null;
      let segmentStopTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let pauseTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let recordingStartedAtMs = 0;
      let runtimeMode: MediaLibraryRecordingMode = readPluginConfig(context.moduleId).defaultMode;

      syncStateFromConfig(context.moduleId, runtimeMode);
      publishMediaLibraryQuotaFromService();

      const clearProgressTimer = (): void => {
        if (progressTimerId != null) {
          clearInterval(progressTimerId);
          progressTimerId = null;
        }
      };

      const clearSegmentStopTimer = (): void => {
        if (segmentStopTimeoutId != null) {
          clearTimeout(segmentStopTimeoutId);
          segmentStopTimeoutId = null;
        }
      };

      const clearPauseTimer = (): void => {
        if (pauseTimeoutId != null) {
          clearTimeout(pauseTimeoutId);
          pauseTimeoutId = null;
        }
      };

      const clearAutoTimers = (): void => {
        clearPauseTimer();
      };

      const clearRecordingTimers = (): void => {
        clearProgressTimer();
        clearSegmentStopTimer();
      };

      const cancelActiveRecorder = (reason: string): void => {
        if (!activeRecorder) return;
        activeRecorder.cancel();
        activeRecorder = null;
        publishMediaLibraryCaptureCancel({
          reason,
          sourcePluginId: MIC_BUFFER_RECORDER_PLUGIN_ID,
        });
      };

      const finishActiveRecorder = async (
        reason: 'user' | 'timer' | 'auto' | 'error',
      ): Promise<void> => {
        const recorder = activeRecorder;
        activeRecorder = null;
        if (!recorder) return;

        try {
          const clip = await recorder.stop();
          const snap = micBufferRecorderPluginState.getSnapshot();
          publishMediaLibraryCaptureStop({
            reason,
            blob: clip.blob,
            sourcePluginId: MIC_BUFFER_RECORDER_PLUGIN_ID,
            moduleId: context.moduleId,
            captureMode: runtimeMode,
            meta: {
              title: buildSampleTitle(runtimeMode, snap.effectiveFormat),
              class: 'unlabeled',
              label: 'unlabeled',
              durationSec: clip.durationSec,
              sampleRate: clip.sampleRate,
              channels: clip.channels,
              notes: `mode=${runtimeMode};reason=${reason}`,
            },
          });
          micBufferRecorderPluginState.setError(null);
        } catch (err) {
          micBufferRecorderPluginState.setError(
            err instanceof Error ? err.message : 'Не удалось завершить запись',
          );
        } finally {
          micBufferRecorderPluginState.setRecording({
            isRecording: false,
            elapsedSec: 0,
          });
        }
      };

      const canStartRecording = (): boolean => {
        const snap = micBufferRecorderPluginState.getSnapshot();
        if (!currentStream || currentStream.getAudioTracks().length === 0) {
          if (runtimeMode === 'manual') {
            micBufferRecorderPluginState.setError('Запустите поток микрофона в модуле.');
          }
          return false;
        }
        if (snap.recordingBlocked) {
          micBufferRecorderPluginState.setError('Буфер заполнен — очистите или освободите место.');
          return false;
        }
        if (activeRecorder) return false;
        return true;
      };

      const beginRecording = (
        mode: MediaLibraryRecordingMode,
        targetDurationSec: number,
        reasonOnStop: 'user' | 'timer' | 'auto',
      ): void => {
        if (!canStartRecording() || !currentStream) return;

        const cfg = readPluginConfig(context.moduleId);
        const format = pickFallbackCaptureFormat(cfg.defaultFormat);
        publishMediaLibraryCaptureStart({
          mode,
          format,
          targetDurationSec: mode === 'manual' ? targetDurationSec : undefined,
          clipLengthSec: mode === 'auto' ? cfg.autoSegmentSec : undefined,
          intervalSec: mode === 'auto' ? cfg.pauseSec : undefined,
          sourcePluginId: MIC_BUFFER_RECORDER_PLUGIN_ID,
          moduleId: context.moduleId,
        });

        try {
          activeRecorder = startClipRecorder(currentStream, format);
        } catch (err) {
          micBufferRecorderPluginState.setError(
            err instanceof Error ? err.message : 'Не удалось начать запись',
          );
          return;
        }

        recordingStartedAtMs = performance.now();
        micBufferRecorderPluginState.setRecording({
          isRecording: true,
          elapsedSec: 0,
          targetDurationSec,
        });
        micBufferRecorderPluginState.setError(null);

        clearRecordingTimers();
        progressTimerId = setInterval(() => {
          const elapsedSec = (performance.now() - recordingStartedAtMs) / 1000;
          micBufferRecorderPluginState.setElapsedSec(elapsedSec);
        }, 100);

        segmentStopTimeoutId = setTimeout(() => {
          void finishActiveRecorder(reasonOnStop === 'user' ? 'timer' : reasonOnStop).then(() => {
            clearRecordingTimers();
            if (runtimeMode === 'auto') schedulePauseThenNextSegment();
          });
        }, targetDurationSec * 1000);
      };

      const startAutoSegment = (): void => {
        if (disposed || runtimeMode !== 'auto') return;
        if (pauseTimeoutId != null) return;
        const cfg = readPluginConfig(context.moduleId);
        beginRecording('auto', cfg.autoSegmentSec, 'auto');
      };

      const schedulePauseThenNextSegment = (): void => {
        clearPauseTimer();
        if (disposed || runtimeMode !== 'auto') return;
        if (!canStartRecording()) return;

        const cfg = readPluginConfig(context.moduleId);
        if (cfg.pauseSec <= 0) {
          startAutoSegment();
          return;
        }

        pauseTimeoutId = setTimeout(() => {
          pauseTimeoutId = null;
          startAutoSegment();
        }, cfg.pauseSec * 1000);
      };

      const stopAutoRecording = (commitPartial: boolean): void => {
        clearAutoTimers();
        if (activeRecorder) {
          clearRecordingTimers();
          if (commitPartial) {
            void finishActiveRecorder('user');
          } else {
            cancelActiveRecorder('auto-stopped');
          }
        }
      };

      const controller: MicBufferRecorderController = {
        setMode(mode: MediaLibraryRecordingMode): void {
          const prevMode = runtimeMode;

          if (mode === 'manual') {
            runtimeMode = mode;
            syncStateFromConfig(context.moduleId, mode);
            if (prevMode === 'auto') {
              stopAutoRecording(true);
            }
            return;
          }

          if (mode === 'auto') {
            const startAutoAfterManual = (): void => {
              runtimeMode = mode;
              syncStateFromConfig(context.moduleId, mode);
              clearAutoTimers();
              startAutoSegment();
            };

            if (prevMode === 'manual' && activeRecorder) {
              clearRecordingTimers();
              void finishActiveRecorder('user').then(startAutoAfterManual);
              return;
            }

            startAutoAfterManual();
          }
        },
        startManualRecording(): void {
          if (runtimeMode !== 'manual') return;
          const cfg = readPluginConfig(context.moduleId);
          const target = clampManualTargetSec(cfg.manualPresetSec);
          beginRecording('manual', target, 'user');
        },
        stopManualRecording(): void {
          if (runtimeMode !== 'manual' || !activeRecorder) return;
          clearRecordingTimers();
          void finishActiveRecorder('user');
        },
      };

      registerMicBufferRecorderController(controller);

      const unsubStream = subscribeMicrophoneStream(context.moduleId, (stream) => {
        if (disposed) return;
        currentStream = stream;
        const live = Boolean(stream && stream.getAudioTracks().length > 0);
        micBufferRecorderPluginState.setStreamLive(live);
        if (!live) {
          stopAutoRecording(false);
          micBufferRecorderPluginState.setRecording({ isRecording: false, elapsedSec: 0 });
        } else if (runtimeMode === 'auto') {
          startAutoSegment();
        }
      });

      const unsubQuota = subscribeMediaLibraryQuotaUpdated((payload) => {
        micBufferRecorderPluginState.setQuota(payload);
        if (payload.recordingBlocked && activeRecorder) {
          clearAutoTimers();
          clearRecordingTimers();
          void finishActiveRecorder('error');
        }
      });

      const unsubBufferCleared = subscribeMediaLibraryBufferCleared(() => {
        micBufferRecorderPluginState.setError(null);
      });

      if (runtimeMode === 'auto') {
        queueMicrotask(() => startAutoSegment());
      }

      return (): Promise<void> => {
        disposed = true;
        registerMicBufferRecorderController(null);
        unsubStream();
        unsubQuota();
        unsubBufferCleared();
        clearRecordingTimers();
        clearAutoTimers();
        cancelActiveRecorder('plugin-teardown');
        micBufferRecorderPluginState.reset();
        return Promise.resolve();
      };
    },
  };
}
