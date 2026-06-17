import { logger } from '@membrana/core';
import {
  LiveSampler,
  acquireMicrophone,
  getAudioInputDevices,
  getMonoChannel,
  loadAudioBuffer,
  releaseMediaStream,
} from '@membrana/audio-engine-service';
import type {
  ScenarioConnectionHandlers,
  ScenarioDetectionResult,
  ScenarioJournalEvent,
  ScenarioSoundLevelResult,
} from '@membrana/device-board';
import { ALARM_QUIET_RMS_THRESHOLD } from '@membrana/device-board';
import {
  LIVE_JOURNAL_DETECTION_TAG,
  LIVE_JOURNAL_MODULE_NAME,
  TELEMETRY_TRACK_SCHEMA_VERSION,
  getDefaultLiveJournalService,
  liveJournalReportClientEntryId,
  liveJournalTrackClientEntryId,
} from '@membrana/telemetry-journal-service';
import { frameLoudness } from '@membrana/fft-analyzer-service';

import {
  getMicrophoneCaptureSnapshot,
  requestMicrophoneStart,
  requestMicrophoneStop,
} from '@/modules/microphone/microphoneCaptureCoordinator';
import { publishMicrophoneStream, subscribeMicrophoneStream } from '@/modules/microphone/microphoneStreamHub';
import { startClipRecorder } from '@/plugins/mic-buffer-recorder/clipRecorder';

import { analyzeChunkTrendsFft } from './analyzeChunkTrendsFft';

const DEVICE_BOARD_MODULE_ID = 'device-board';
const MICROPHONE_MODULE_ID = 'microphone';
const MIN_CHUNK_MS = 5_000;
const MAX_CHUNK_MS = 30_000;
const SOUND_LEVEL_SAMPLE_MS = 200;
const SOUND_LEVEL_FFT_SIZE = 2048;

export interface RecordedChunkMeta {
  readonly clipId: string;
  readonly durationSec: number;
  readonly sampleRate: number;
  readonly blob: Blob;
}

function createEntryId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}`;
}

function clampChunkDurationMs(durationMs: number): number {
  return Math.min(MAX_CHUNK_MS, Math.max(MIN_CHUNK_MS, durationMs));
}

function waitMs(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

async function waitForMicrophoneStream(timeoutMs = 5_000): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const unsub = subscribeMicrophoneStream(MICROPHONE_MODULE_ID, (stream) => {
      if (stream && !settled) {
        settled = true;
        clearTimeout(timer);
        unsub();
        resolve(stream);
      }
    });
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        unsub();
        reject(new Error('Таймаут ожидания потока микрофона'));
      }
    }, timeoutMs);
  });
}

/**
 * Мост mic → chunk → trends FFT → LiveJournal для scenario runtime (H2c).
 */
export class ScenarioMicJournalBridge {
  private selectedDeviceId = '';

  private ownedStream: MediaStream | null = null;

  private usesCoordinator = false;

  private lastChunk: RecordedChunkMeta | null = null;

  private lastDetection: ScenarioDetectionResult | null = null;

  getLastChunk(): RecordedChunkMeta | null {
    return this.lastChunk;
  }

  getLastDetection(): ScenarioDetectionResult | null {
    return this.lastDetection;
  }

  async selectMicrophone(): Promise<void> {
    const devices = await getAudioInputDevices();
    this.selectedDeviceId = devices[0]?.deviceId ?? '';
    logger.info('[device-board] selectMicrophone', { deviceId: this.selectedDeviceId || 'default' });
  }

  async startStream(): Promise<void> {
    const snapshot = getMicrophoneCaptureSnapshot();
    if (snapshot.isLive) {
      this.usesCoordinator = true;
      logger.info('[device-board] startStream via microphone module');
      return;
    }

    try {
      await requestMicrophoneStart();
      this.usesCoordinator = true;
      logger.info('[device-board] startStream via coordinator');
      return;
    } catch {
      // Модуль микрофона не смонтирован — свой поток.
    }

    const audio: MediaTrackConstraints | true = this.selectedDeviceId
      ? { deviceId: { exact: this.selectedDeviceId } }
      : true;
    this.ownedStream = await acquireMicrophone(audio);
    publishMicrophoneStream(MICROPHONE_MODULE_ID, this.ownedStream);
    this.usesCoordinator = false;
    logger.info('[device-board] startStream via owned MediaStream');
  }

  async stopStream(): Promise<void> {
    if (this.usesCoordinator) {
      requestMicrophoneStop();
      logger.info('[device-board] stopStream via coordinator');
      return;
    }
    if (this.ownedStream !== null) {
      publishMicrophoneStream(MICROPHONE_MODULE_ID, null);
      releaseMediaStream(this.ownedStream);
      this.ownedStream = null;
      logger.info('[device-board] stopStream released owned stream');
    }
  }

  async recordChunk(options: { readonly durationMs: number }): Promise<{ readonly clipId: string }> {
    const durationMs = clampChunkDurationMs(options.durationMs);
    const stream = await this.resolveActiveStream();
    const recorder = startClipRecorder(stream, 'wav');

    try {
      await waitMs(durationMs);
      const clip = await recorder.stop();
      const clipId = createEntryId('clip');
      this.lastChunk = {
        clipId,
        durationSec: clip.durationSec,
        sampleRate: clip.sampleRate,
        blob: clip.blob,
      };
      logger.info('[device-board] recordChunk', {
        clipId,
        durationSec: clip.durationSec,
        durationMs,
      });
      return { clipId };
    } catch (error) {
      recorder.cancel();
      throw error;
    }
  }

  async trendsFftDetect(): Promise<ScenarioDetectionResult> {
    if (this.lastChunk === null) {
      throw new Error('Нет записанного чанка — сначала выполните record-chunk');
    }

    const buffer = await loadAudioBuffer(this.lastChunk.blob);
    const samples = getMonoChannel(buffer);
    const analysis = analyzeChunkTrendsFft(samples, buffer.sampleRate);

    this.lastDetection = {
      detected: analysis.result.isDetected,
      confidence: analysis.result.confidence,
      templateId: analysis.result.detectedState,
      rawLevel: analysis.rawLevel,
    };

    logger.info('[device-board] trendsFftDetect', {
      detected: this.lastDetection.detected,
      templateId: this.lastDetection.templateId,
      confidence: this.lastDetection.confidence,
      rawLevel: this.lastDetection.rawLevel,
    });

    return this.lastDetection;
  }

  async evaluateSoundLevel(): Promise<ScenarioSoundLevelResult> {
    const stream = await this.resolveActiveStream();
    const sampler = new LiveSampler({
      bufferSize: SOUND_LEVEL_FFT_SIZE,
      smoothingTimeConstant: 0.5,
    });

    const loudnessSamples: number[] = [];

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => resolve(), SOUND_LEVEL_SAMPLE_MS);
        sampler.on('frame', (frame) => {
          loudnessSamples.push(frameLoudness(frame.samples));
        });
        sampler.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        void sampler.start(stream).catch(reject);
      });
    } finally {
      await sampler.stop();
    }

    const rawLevel =
      loudnessSamples.length > 0
        ? loudnessSamples.reduce((sum, value) => sum + value, 0) / loudnessSamples.length
        : 0;
    const isQuietEnough = rawLevel <= ALARM_QUIET_RMS_THRESHOLD;

    logger.info('[device-board] evaluateSoundLevel', { rawLevel, isQuietEnough });

    return { rawLevel, isQuietEnough };
  }

  async writeJournal(event: ScenarioJournalEvent): Promise<void> {
    const service = getDefaultLiveJournalService();
    const reportId = createEntryId('scenario');
    const trackId = this.lastChunk?.clipId ?? reportId;

    if (event.branch === 'main' && this.lastChunk !== null) {
      await service.appendTrack({
        clientEntryId: liveJournalTrackClientEntryId(trackId),
        moduleId: DEVICE_BOARD_MODULE_ID,
        moduleName: LIVE_JOURNAL_MODULE_NAME,
        tags: ['scenario:main', 'device-board:chunk'],
        track: {
          schema: TELEMETRY_TRACK_SCHEMA_VERSION,
          trackId,
          sampleId: trackId,
          title: `device-board ${trackId.slice(0, 8)}`,
          durationSec: this.lastChunk.durationSec,
          sampleRate: this.lastChunk.sampleRate,
          captureMode: 'auto',
          createdAtIso: new Date().toISOString(),
        },
      });
    }

    const detected = event.payload?.detected === true;
    const tags = [`scenario:${event.branch}`];
    if (event.branch === 'alarm') {
      tags.push('device-board:alarm');
    }
    if (event.branch === 'onStop') {
      tags.push('device-board:on-stop');
    }
    if (event.branch === 'onDisconnect') {
      tags.push('device-board:on-disconnect');
    }
    if (detected) {
      tags.push(LIVE_JOURNAL_DETECTION_TAG);
    }

    await service.appendReport({
      clientEntryId: liveJournalReportClientEntryId(reportId),
      moduleId: DEVICE_BOARD_MODULE_ID,
      moduleName: LIVE_JOURNAL_MODULE_NAME,
      tags,
      report: {
        schema: 'device-board-scenario/v1',
        reportId,
        trackId,
        isDetected: detected,
        summaryText: event.message,
        payload: {
          branch: event.branch,
          blockKind: event.blockKind,
          nodeId: event.nodeId,
          clipId: this.lastChunk?.clipId,
          durationSec: this.lastChunk?.durationSec,
          sampleRate: this.lastChunk?.sampleRate,
          detectorId:
            event.branch === 'alarm'
              ? 'sound-level'
              : event.branch === 'onStop'
                ? 'on-stop'
                : event.branch === 'onDisconnect'
                  ? 'on-disconnect'
                  : 'trends-fft',
          templateId: event.payload?.templateId ?? this.lastDetection?.templateId,
          confidence: event.payload?.confidence ?? this.lastDetection?.confidence,
          rawLevel: event.payload?.rawLevel ?? this.lastDetection?.rawLevel,
        },
      },
    });
  }

  /** Подписка на потерю/восстановление mic-потока (H3b). */
  watchConnection(handlers: ScenarioConnectionHandlers): () => void {
    let wasConnected = false;
    let disconnected = false;
    const trackCleanups: Array<() => void> = [];

    const clearTrackListeners = (): void => {
      for (const cleanup of trackCleanups) {
        cleanup();
      }
      trackCleanups.length = 0;
    };

    const attachTrackListeners = (stream: MediaStream): void => {
      clearTrackListeners();
      for (const track of stream.getAudioTracks()) {
        const onEnded = (): void => {
          if (!disconnected) {
            disconnected = true;
            wasConnected = false;
            logger.info('[device-board] mic track ended');
            handlers.onDisconnect();
          }
        };
        track.addEventListener('ended', onEnded);
        trackCleanups.push(() => track.removeEventListener('ended', onEnded));
      }
    };

    const onStream = (stream: MediaStream | null): void => {
      if (stream !== null && stream.active && stream.getAudioTracks().length > 0) {
        const hasLiveTrack = stream.getAudioTracks().some((track) => track.readyState === 'live');
        if (hasLiveTrack) {
          attachTrackListeners(stream);
          if (disconnected) {
            disconnected = false;
            logger.info('[device-board] mic stream reconnected');
            handlers.onReconnect();
          }
          wasConnected = true;
          return;
        }
      }

      clearTrackListeners();
      if (wasConnected && !disconnected) {
        disconnected = true;
        wasConnected = false;
        logger.info('[device-board] mic stream lost');
        handlers.onDisconnect();
      }
    };

    const unsubs = [
      subscribeMicrophoneStream(MICROPHONE_MODULE_ID, onStream),
      subscribeMicrophoneStream(DEVICE_BOARD_MODULE_ID, onStream),
    ];

    return () => {
      for (const unsub of unsubs) {
        unsub();
      }
      clearTrackListeners();
    };
  }

  private async resolveActiveStream(): Promise<MediaStream> {
    if (this.ownedStream !== null && this.ownedStream.active) {
      return this.ownedStream;
    }

    const snapshot = getMicrophoneCaptureSnapshot();
    if (snapshot.isLive) {
      return waitForMicrophoneStream();
    }

    await this.startStream();
    if (this.ownedStream !== null && this.ownedStream.active) {
      return this.ownedStream;
    }
    return waitForMicrophoneStream();
  }
}

export function createScenarioMicJournalBridge(): ScenarioMicJournalBridge {
  return new ScenarioMicJournalBridge();
}
