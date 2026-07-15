import { createReferenceValue, DomainError, type ScenarioFftTrendsPolicy, type ScenarioReferenceValue, type ScenarioReportPayload, createScenarioReportPayload, FFT_TREND_ANALYSIS_REF_HANDLE_PREFIX, parseJournalRefHandle, TRACK_REF_HANDLE_PREFIX, formatRecordingSliceRefHandle, type ScenarioCaptureFormat, type ScenarioRecordingPolicy, type ScenarioAsyncJobCorrelation, type ScenarioAsyncJobKind } from '@membrana/core';
import { scenarioChainLog, scenarioRuntimeInfo } from './scenarioRuntimeInfoGate';
import { setScenarioTraceNodeId } from './scenarioTraceContext';
import {
  createDeviceCollectorRegistry,
  type CollectorSessionFlushSnapshot,
  type DeviceCollectorRegistry,
  RecorderRecordingSession,
  type RecordingSliceMeta,
  type AsyncJobStore,
} from '@membrana/device-board';
import {
  LiveSampler,
  acquireMicrophone,
  getAudioInputDevices,
  getMonoChannel,
  loadAudioBuffer,
  releaseMediaStream,
  type AudioSampleFrame,
} from '@membrana/audio-engine-service';
import type {
  ScenarioConnectionHandlers,
  ScenarioDetectionResult,
  ScenarioJournalEvent,
  ScenarioMicrophoneOption,
  ScenarioSoundLevelResult,
} from '@membrana/device-board';
import { ALARM_QUIET_RMS_THRESHOLD } from '@membrana/device-board';
import {
  LIVE_JOURNAL_DETECTION_TAG,
  LIVE_JOURNAL_MODULE_NAME,
  TELEMETRY_TRACK_SCHEMA_VERSION,
  findTrackForReport,
  getDefaultLiveJournalService,
  liveJournalReportClientEntryId,
  liveJournalTrackClientEntryId,
} from '@membrana/telemetry-journal-service';
import {
  BUFFER_COLLECTION_ID,
  getDefaultMediaLibraryService,
  resolveMediaLibraryStorageMode,
} from '@membrana/media-library-service';
import { FftAnalyzer, frameLoudness } from '@membrana/fft-analyzer-service';

import {
  getMicrophoneCaptureSnapshot,
  requestMicrophoneStart,
  requestMicrophoneStop,
} from '@/modules/microphone/microphoneCaptureCoordinator';
import { publishMicrophoneStream, subscribeMicrophoneStream } from '@/modules/microphone/microphoneStreamHub';
import { reconfigureJournalFromConnection } from '@/lib/journalHubBridge';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';
import { encodeWavPcm16 } from '@/plugins/mic-buffer-recorder/encodeWav';
import { startClipRecorder, type ActiveClipRecorder } from '@/plugins/mic-buffer-recorder/clipRecorder';
import { pickFallbackCaptureFormat } from '@/plugins/mic-buffer-recorder/recordingUtils';
import { analyzeTrendsFromFftFrames } from './analyzeTrendsFromFftFrames';
import { concatAudioSamplePayloads } from './concat-audio-samples';
import { EnsembleProducer } from '@membrana/detection-ensemble-service';
import { classifyProximityTrend, fuseDetectorConfidences, type ProximityTrendResult } from '@membrana/core';
import { createCombinedStreamDetectors } from '../../plugins/mic-combined-detection/createCombinedStreamDetectors';
import { ScenarioContinuousPcmBuffer } from './scenario-continuous-pcm-buffer';

import { analyzeChunkTrendsFft } from './analyzeChunkTrendsFft';
import { buildRecordingUploadNotes, normalizeCaptureBlob } from './recording-upload-utils';
import { buildTrendsFftReport, type TrendsFftReport } from '@/plugins/trends-fft-analyzer/buildTrendsFftReport';
import {
  createTrendsFftScenarioReportPayload,
} from './makeTrendsFftScenarioReportPayload';
import { analyzeSampleDetectors } from '@/plugins/sample-library-drone-analysis/analyzeSampleDetectors';
import {
  buildDroneDetectionSummaryText,
  isDroneDetectionConsensus,
} from '@/plugins/sample-library-drone-analysis/droneAnalysisTelemetry';
import { DRONE_DETECTION_REPORT_SCHEMA_VERSION } from '@membrana/detector-report';

const DEVICE_BOARD_MODULE_ID = 'device-board';
const MICROPHONE_MODULE_ID = 'microphone';
const MIN_CHUNK_MS = 5_000;
const MAX_CHUNK_MS = 30_000;
const SOUND_LEVEL_SAMPLE_MS = 200;
const SOUND_LEVEL_FFT_SIZE = 2048;
const SAMPLE_CAPTURE_MS = 100;

/** Метаданные захваченного отрезка (без сырых сэмплов). */
export interface AudioSamplePayloadMeta {
  readonly streamHandle: string;
  readonly microphoneId: string;
  readonly sampleRate: number;
  readonly sampleCount: number;
  readonly durationMs: number;
  readonly capturedAtIso: string;
  readonly rms: number;
}

interface AudioSamplePayload extends AudioSamplePayloadMeta {
  readonly samples: Float32Array;
}

/** Метаданные FFT-кадра для Print. */
export interface FftFramePayloadMeta {
  readonly sampleHandle: string;
  readonly sampleRate: number;
  readonly fftSize: number;
  readonly binCount: number;
  readonly dominantHz: number;
  readonly spectralCentroidHz: number;
  readonly flux: number;
  readonly rms: number;
  readonly computedAtIso: string;
}

export interface RecordedChunkMeta {
  readonly clipId: string;
  readonly durationSec: number;
  readonly sampleRate: number;
  readonly blob: Blob;
}

/** Отложенный upload трека (AP v1: стартует через Start Async Job). */
interface PendingTrackUpload {
  readonly nodeId: string;
  readonly trackId: string;
  readonly title: string;
  readonly blob: Blob;
  readonly durationSec: number;
  readonly sampleRate: number;
  readonly captureFormat: ScenarioCaptureFormat;
}

export interface StartAsyncJobBridgeInput {
  readonly promiseId: string;
  readonly kind: ScenarioAsyncJobKind;
  readonly correlation: ScenarioAsyncJobCorrelation;
  readonly trackRef: ScenarioReferenceValue | null;
  readonly asyncJobStore: AsyncJobStore;
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

function parseTrackIdFromHandle(handle: string): string | null {
  const prefix = `${TRACK_REF_HANDLE_PREFIX}:`;
  if (!handle.startsWith(prefix)) {
    return null;
  }
  const trackId = handle.slice(prefix.length);
  return trackId.length > 0 ? trackId : null;
}

function parseAnalysisIdFromHandle(handle: string): string | null {
  const prefix = `${FFT_TREND_ANALYSIS_REF_HANDLE_PREFIX}:`;
  if (!handle.startsWith(prefix)) {
    return null;
  }
  const analysisId = handle.slice(prefix.length);
  return analysisId.length > 0 ? analysisId : null;
}

function peakSampleAbs(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.abs(samples[i]!);
    if (value > peak) {
      peak = value;
    }
  }
  return peak;
}

function samplePayloadSummary(payload: AudioSamplePayload): Record<string, unknown> {
  return {
    sampleRate: payload.sampleRate,
    sampleCount: payload.sampleCount,
    durationMs: payload.durationMs.toFixed(1),
    rms: payload.rms.toFixed(6),
    peakAbs: peakSampleAbs(payload.samples).toFixed(6),
  };
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

  private audioStreamHandle: string | null = null;

  private audioStreamValid = false;

  private audioStreamMicrophoneId = '';

  private audioStreamStartedAtIso: string | null = null;

  private audioSampleByNode = new Map<string, ScenarioReferenceValue>();

  private audioSamplePayloads = new Map<string, AudioSamplePayload>();
  /** basn-4: серии громкости/score per nodeId для classifyProximityTrend. */
  private proximityHistory = new Map<string, { loudness: number[]; scores: number[] }>();
  /** basn-5: идемпотентность combined-отчётов по хэшу входов. */
  private combinedReportCache = new Map<string, ScenarioReportPayload>();

  private fftFrameByNode = new Map<string, ScenarioReferenceValue>();

  private fftFramePayloads = new Map<string, FftFramePayloadMeta>();

  private readonly fftTrendAnalyses = new Map<string, TrendsFftReport>();

  /** PC-2: per-node точка отсчёта периодического окна (is-window-elapsed), мс. */
  private readonly windowElapsedStartMs = new Map<string, number>();

  private readonly collectorRegistry: DeviceCollectorRegistry = createDeviceCollectorRegistry();

  private readonly continuousPcmByDevice = new Map<string, ScenarioContinuousPcmBuffer>();

  private readonly recordingSessions = new Map<string, RecorderRecordingSession>();

  private readonly recordingSlicePayloads = new Map<string, RecordingSlicePayload>();

  private readonly pendingTrackUploads = new Map<string, PendingTrackUpload>();

  private readonly activeClipRecorders = new Map<string, ActiveClipCapture>();

  private recordingSliceSeq = 0;

  private lastRecorderFlushDeviceHandle: string | null = null;

  /** Reused across main ticks — avoids cold AnalyserNode frames (all zeros). */
  private streamCaptureSampler: LiveSampler | null = null;

  private streamCaptureStream: MediaStream | null = null;

  /** Stateful flux между FFT-кадрами main loop (P3 trends path). */
  private readonly scenarioFftAnalyzer = new FftAnalyzer({ fftSize: SOUND_LEVEL_FFT_SIZE });

  getLastChunk(): RecordedChunkMeta | null {
    return this.lastChunk;
  }

  getLastDetection(): ScenarioDetectionResult | null {
    return this.lastDetection;
  }

  /** Список audio-input для UI GetMicrophone (запрашивает разрешение, если label пустые). */
  async enumerateMicrophones(): Promise<readonly ScenarioMicrophoneOption[]> {
    let devices = await getAudioInputDevices();
    if (devices.length > 0 && devices.every((device) => device.label.trim() === '')) {
      try {
        const stream = await acquireMicrophone();
        releaseMediaStream(stream);
        devices = await getAudioInputDevices();
      } catch {
        // Без разрешения остаются deviceId без label.
      }
    }
    return devices.map((device) => ({
      deviceId: device.deviceId,
      label:
        device.label.trim() !== ''
          ? device.label
          : `Микрофон ${device.deviceId.slice(0, 8) || 'default'}`,
    }));
  }

  async selectMicrophone(): Promise<void> {
    const devices = await getAudioInputDevices();
    this.selectedDeviceId = devices[0]?.deviceId ?? '';
    scenarioRuntimeInfo('[device-board] selectMicrophone', { deviceId: this.selectedDeviceId || 'default' });
  }

  getActiveAudioStreamRef(): ScenarioReferenceValue {
    if (!this.audioStreamValid || this.audioStreamHandle === null) {
      return { kind: 'AudioStreamRef', handle: null, valid: false };
    }
    return createReferenceValue('AudioStreamRef', this.audioStreamHandle);
  }

  getAudioStreamMeta(handle: string): {
    readonly microphoneId: string;
    readonly startedAtIso: string | null;
    readonly active: boolean;
  } | null {
    if (this.audioStreamHandle !== handle) {
      return null;
    }
    return {
      microphoneId: this.audioStreamMicrophoneId,
      startedAtIso: this.audioStreamStartedAtIso,
      active: this.audioStreamValid,
    };
  }

  getCapturedAudioSampleRef(nodeId: string): ScenarioReferenceValue | null {
    return this.audioSampleByNode.get(nodeId) ?? { kind: 'AudioSampleRef', handle: null, valid: false };
  }

  getAudioSamplePayloadMeta(sampleHandle: string): AudioSamplePayloadMeta | null {
    const payload = this.audioSamplePayloads.get(sampleHandle);
    if (payload === undefined) {
      return null;
    }
    const { samples: _samples, ...meta } = payload;
    return meta;
  }

  getCapturedFftFrameRef(nodeId: string): ScenarioReferenceValue | null {
    return this.fftFrameByNode.get(nodeId) ?? { kind: 'FftFrameRef', handle: null, valid: false };
  }

  getFftFramePayload(frameHandle: string): FftFramePayloadMeta | null {
    return this.fftFramePayloads.get(frameHandle) ?? null;
  }

  /** v0.5 DBC2: singleton RecorderRef для deviceHandle. */
  getRecorderSessionRef(deviceHandle: string): ScenarioReferenceValue {
    return this.collectorRegistry.getRecorderSessionRef(deviceHandle);
  }

  /** v0.5 DBC2: singleton SpectralAnalyserRef для deviceHandle. */
  getSpectralAnalyserSessionRef(deviceHandle: string): ScenarioReferenceValue {
    return this.collectorRegistry.getSpectralAnalyserSessionRef(deviceHandle);
  }

  appendRecorderSample(deviceHandle: string, sampleRef: ScenarioReferenceValue): boolean {
    const accepted = this.collectorRegistry.appendSample(deviceHandle, sampleRef);
    const session = this.collectorRegistry.getOrCreateRecorder(deviceHandle);
    const payload =
      sampleRef.handle !== null ? this.audioSamplePayloads.get(sampleRef.handle) : undefined;
    if (accepted && payload !== undefined) {
      this.appendContinuousPcm(deviceHandle, payload.samples, payload.sampleRate);
    }
    scenarioChainLog('collect', accepted ? 'recorder-append-ok' : 'recorder-append-rejected', {
      deviceHandle,
      sampleId: sampleRef.handle,
      queueDepth: session.queueDepth,
      ...(payload !== undefined ? samplePayloadSummary(payload) : {}),
    });
    return accepted;
  }

  appendSpectralAnalyserFrame(deviceHandle: string, frameRef: ScenarioReferenceValue): boolean {
    const accepted = this.collectorRegistry.appendFrame(deviceHandle, frameRef);
    const session = this.collectorRegistry.getOrCreateSpectralAnalyser(deviceHandle);
    const frameMeta =
      frameRef.handle !== null ? this.fftFramePayloads.get(frameRef.handle) : undefined;
    scenarioChainLog('collect', accepted ? 'analyser-append-ok' : 'analyser-append-rejected', {
      deviceHandle,
      frameId: frameRef.handle,
      queueDepth: session.queueDepth,
      frameRms: frameMeta?.rms.toFixed(6) ?? null,
      dominantHz: frameMeta?.dominantHz.toFixed(1) ?? null,
    });
    return accepted;
  }

  flushRecorderSession(deviceHandle: string): CollectorSessionFlushSnapshot | null {
    this.lastRecorderFlushDeviceHandle = deviceHandle;
    const snapshot = this.collectorRegistry.flushRecorder(deviceHandle);
    if (snapshot === null) {
      scenarioChainLog('collect', 'recorder-flush-empty', { deviceHandle });
      return null;
    }
    const samples = snapshot.refs.map((ref) => {
      const payload = ref.handle !== null ? this.audioSamplePayloads.get(ref.handle) : undefined;
      return {
        sampleId: ref.handle,
        ...(payload !== undefined ? samplePayloadSummary(payload) : { missing: true }),
      };
    });
    scenarioChainLog('collect', 'recorder-flush', {
      deviceHandle,
      batchSize: snapshot.refs.length,
      flushedAt: snapshot.flushedAtIso,
      samples,
    });
    return snapshot;
  }

  flushSpectralAnalyserSession(deviceHandle: string): CollectorSessionFlushSnapshot | null {
    const snapshot = this.collectorRegistry.flushSpectralAnalyser(deviceHandle);
    if (snapshot === null) {
      scenarioChainLog('collect', 'analyser-flush-empty', { deviceHandle });
      return null;
    }
    const frames = snapshot.refs.map((ref) => {
      const meta = ref.handle !== null ? this.fftFramePayloads.get(ref.handle) : undefined;
      return {
        frameId: ref.handle,
        rms: meta?.rms.toFixed(6) ?? null,
        dominantHz: meta?.dominantHz.toFixed(1) ?? null,
      };
    });
    scenarioChainLog('collect', 'analyser-flush', {
      deviceHandle,
      batchSize: snapshot.refs.length,
      flushedAt: snapshot.flushedAtIso,
      frames,
    });
    return snapshot;
  }

  subscribeRecorderCollect(deviceHandle: string, collectNodeId: string): () => void {
    return this.collectorRegistry.getOrCreateRecorder(deviceHandle).subscribe(collectNodeId);
  }

  subscribeSpectralAnalyserCollect(deviceHandle: string, collectNodeId: string): () => void {
    return this.collectorRegistry.getOrCreateSpectralAnalyser(deviceHandle).subscribe(collectNodeId);
  }

  /** Сброс singleton-очередей при load/start сценария (CollectRuntimeStore сбрасывается отдельно). */
  resetCollectorSessions(): void {
    this.collectorRegistry.resetAll();
    this.continuousPcmByDevice.clear();
    this.recordingSessions.clear();
    this.cancelAllActiveClipRecorders();
    this.recordingSlicePayloads.clear();
    this.recordingSliceSeq = 0;
    this.lastRecorderFlushDeviceHandle = null;
    this.scenarioFftAnalyzer.resetState();
  }

  startRecorderRecording(
    deviceHandle: string,
    streamRef: ScenarioReferenceValue,
    policy: ScenarioRecordingPolicy,
  ): boolean {
    if (!streamRef.valid || streamRef.kind !== 'AudioStreamRef') {
      scenarioChainLog('recording', 'start-recording-skip', {
        deviceHandle,
        reason: 'invalid-stream',
      });
      return false;
    }
    let session = this.recordingSessions.get(deviceHandle);
    if (session === undefined) {
      session = new RecorderRecordingSession();
      this.recordingSessions.set(deviceHandle, session);
    }
    const activeCapture = this.activeClipRecorders.get(deviceHandle);
    if (session.isActive()) {
      if (activeCapture !== undefined) {
        scenarioChainLog('recording', 'start-recording-idempotent', { deviceHandle });
        return true;
      }
      // Gate cycle restart (then-3): session timer active but clip was consumed on StopRecording.
      scenarioChainLog('recording', 'start-recording-rearm', {
        deviceHandle,
        reason: 'active-without-capture',
      });
    }
    const stream = this.resolveActiveStreamSync();
    if (stream === null) {
      scenarioChainLog('recording', 'start-recording-skip', {
        deviceHandle,
        reason: 'no-stream',
      });
      return false;
    }
    this.cancelActiveClipRecorder(deviceHandle);
    const captureFormat = pickFallbackCaptureFormat(policy.captureFormat);
    const encoder = captureFormat === 'wav' ? 'worklet' : 'mediarecorder';
    const recorder = startClipRecorder(stream, captureFormat);
    this.activeClipRecorders.set(deviceHandle, { recorder, captureFormat, encoder });
    session.start(policy, Date.now());
    scenarioChainLog('recording', 'start-recording', {
      deviceHandle,
      windowSec: policy.windowSec,
      captureFormat,
      encoder,
      stream: streamRef.handle,
    });
    return true;
  }

  async stopRecorderRecording(deviceHandle: string): Promise<RecordingSliceMeta | null> {
    const session = this.recordingSessions.get(deviceHandle);
    if (session === undefined || !session.isActive()) {
      scenarioChainLog('recording', 'stop-recording-skip', { deviceHandle, reason: 'inactive' });
      return null;
    }
    const capture = this.activeClipRecorders.get(deviceHandle);
    session.stop();
    if (capture === undefined) {
      scenarioChainLog('recording', 'stop-recording-skip', { deviceHandle, reason: 'no-clip-recorder' });
      return null;
    }
    this.activeClipRecorders.delete(deviceHandle);
    let clip;
    try {
      clip = await capture.recorder.stop();
    } catch (error) {
      scenarioChainLog('recording', 'stop-recording-error', {
        deviceHandle,
        reason: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    if (clip.durationSec <= 0 || clip.blob.size === 0) {
      scenarioChainLog('recording', 'stop-recording-empty', { deviceHandle });
      return null;
    }
    this.recordingSliceSeq += 1;
    const handle = formatRecordingSliceRefHandle(deviceHandle, this.recordingSliceSeq);
    this.recordingSlicePayloads.set(handle, {
      blob: clip.blob,
      sampleRate: clip.sampleRate,
      durationSec: clip.durationSec,
      captureFormat: capture.captureFormat,
    });
    this.lastRecorderFlushDeviceHandle = deviceHandle;
    scenarioChainLog('recording', 'stop-recording', {
      deviceHandle,
      handle,
      durationSec: clip.durationSec.toFixed(3),
      sampleRate: clip.sampleRate,
      captureFormat: capture.captureFormat,
      encoder: capture.encoder,
      blobBytes: clip.blob.size,
    });
    return {
      handle,
      deviceHandle,
      durationSec: clip.durationSec,
      sampleRate: clip.sampleRate,
      captureFormat: capture.captureFormat,
    };
  }

  getRecorderElapsedSec(deviceHandle: string): number {
    return this.recordingSessions.get(deviceHandle)?.getElapsedSec(Date.now()) ?? 0;
  }

  isRecorderWindowFull(deviceHandle: string, windowSec: number): boolean {
    const full =
      this.recordingSessions.get(deviceHandle)?.isWindowFull(Date.now(), windowSec) ?? false;
    if (full) {
      scenarioChainLog('recording', 'recording-window-full', { deviceHandle, windowSec });
    }
    return full;
  }

  /** PCM rolling buffer per device (CollectSamples legacy + GetSample v0.7 gate). */
  private appendContinuousPcm(
    deviceHandle: string,
    samples: Float32Array,
    sampleRate: number,
  ): void {
    let buffer = this.continuousPcmByDevice.get(deviceHandle);
    if (buffer === undefined) {
      buffer = new ScenarioContinuousPcmBuffer();
      this.continuousPcmByDevice.set(deviceHandle, buffer);
    }
    buffer.append(samples, sampleRate);
  }

  /** v0.5 DBC4: PCM slice → LiveJournal track (upload async, не блокирует tick). */
  async createTrackFromSampleRefs(
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
  ): Promise<{ readonly trackId: string } | null> {
    setScenarioTraceNodeId(nodeId);
    scenarioChainLog('track', 'start', {
      nodeId,
      incomingRefCount: refs.length,
      incomingSampleIds: refs.map((ref) => ref.handle),
    });

    const payloads: AudioSamplePayload[] = [];
    for (const ref of refs) {
      if (!ref.valid || ref.handle === null || ref.kind !== 'AudioSampleRef') {
        continue;
      }
      const payload = this.audioSamplePayloads.get(ref.handle);
      if (payload !== undefined) {
        payloads.push(payload);
      }
    }

    let concat = null as ReturnType<typeof concatAudioSamplePayloads>;
    const deviceHandle = this.lastRecorderFlushDeviceHandle;
    if (deviceHandle !== null) {
      const buffer = this.continuousPcmByDevice.get(deviceHandle);
      const slice = buffer?.takeSlice() ?? null;
      if (slice !== null) {
        concat = {
          samples: slice.samples,
          sampleRate: slice.sampleRate,
          durationSec: slice.samples.length / slice.sampleRate,
        };
        scenarioChainLog('track', 'continuous-slice-ok', {
          nodeId,
          deviceHandle,
          durationSec: concat.durationSec.toFixed(3),
          sampleCount: slice.samples.length,
        });
      }
    }
    if (concat === null) {
      concat = concatAudioSamplePayloads(payloads);
    }
    if (concat === null) {
      scenarioChainLog('track', 'abort', { nodeId, reason: 'empty-concat', payloadCount: payloads.length });
      return null;
    }

    const trackId = createEntryId('track');
    const titleSuffix = trackId.startsWith('track-')
      ? trackId.slice('track-'.length, 'track-'.length + 12)
      : trackId.slice(0, 12);
    const title = `MakeTrack ${titleSuffix}`;
    const blob = encodeWavPcm16(concat.samples, concat.sampleRate);
    const peakRms = payloads.reduce((max, payload) => Math.max(max, payload.rms), 0);

    scenarioChainLog('track', 'concat-ok', {
      nodeId,
      trackId,
      sampleCount: payloads.length,
      durationSec: concat.durationSec.toFixed(3),
      sampleRate: concat.sampleRate,
      peakRms: peakRms.toFixed(6),
      peakAbs: peakSampleAbs(concat.samples).toFixed(6),
      wavBytes: blob.size,
      uploadMode: 'deferred',
    });

    this.pendingTrackUploads.set(trackId, {
      nodeId,
      trackId,
      title,
      blob,
      durationSec: concat.durationSec,
      sampleRate: concat.sampleRate,
      captureFormat: 'wav',
    });

    return { trackId };
  }

  /** v0.7: MakeTrack из RecordingSliceRef (StopRecording path). */
  async createTrackFromRecordingSliceRef(
    nodeId: string,
    sliceRef: ScenarioReferenceValue,
  ): Promise<{ readonly trackId: string } | null> {
    if (
      !sliceRef.valid ||
      sliceRef.handle === null ||
      sliceRef.kind !== 'RecordingSliceRef'
    ) {
      scenarioChainLog('track', 'slice-abort', { nodeId, reason: 'invalid-slice-ref' });
      return null;
    }
    const slice = this.recordingSlicePayloads.get(sliceRef.handle);
    if (slice === undefined) {
      scenarioChainLog('track', 'slice-abort', { nodeId, reason: 'missing-payload', handle: sliceRef.handle });
      return null;
    }
    setScenarioTraceNodeId(nodeId);
    const durationSec = slice.durationSec;
    scenarioChainLog('track', 'slice-start', {
      nodeId,
      handle: sliceRef.handle,
      durationSec: durationSec.toFixed(3),
      captureFormat: slice.captureFormat,
      blobBytes: slice.blob.size,
      uploadMode: 'deferred',
    });
    const trackId = createEntryId('track');
    const titleSuffix = trackId.startsWith('track-')
      ? trackId.slice('track-'.length, 'track-'.length + 12)
      : trackId.slice(0, 12);
    const title = `MakeTrack ${titleSuffix}`;
    const uploadBlob = normalizeCaptureBlob(slice.blob, slice.captureFormat);
    this.pendingTrackUploads.set(trackId, {
      nodeId,
      trackId,
      title,
      blob: uploadBlob,
      durationSec,
      sampleRate: slice.sampleRate,
      captureFormat: slice.captureFormat,
    });
    this.recordingSlicePayloads.delete(sliceRef.handle);
    return { trackId };
  }

  /**
   * AP v1: host bridge для `start-async-job` — upload / report side-effects с resolve/reject job.
   */
  async startAsyncJob(input: StartAsyncJobBridgeInput): Promise<void> {
    const { promiseId, kind, correlation, trackRef, asyncJobStore } = input;

    if (kind === 'report-build') {
      // comp follow-up (#336, Pre-vote п.2): combined-отчёт уже синхронно
      // сконструирован make-combined-report (идемпотентно по хэшу входов);
      // job — точка детача тяжёлой упаковки. Резолвим после микротаска —
      // итерация main loop не блокируется, on-async-resolved получает событие.
      await Promise.resolve();
      asyncJobStore.resolve(promiseId);
      scenarioChainLog('async-job', 'resolved', {
        promiseId,
        kind,
        reason: 'report-build-detached',
      });
      return;
    }

    if (kind !== 'track-upload') {
      asyncJobStore.reject(promiseId, `unsupported-async-job-kind:${kind}`);
      scenarioChainLog('async-job', 'rejected', {
        promiseId,
        kind,
        reason: 'unsupported-kind',
      });
      return;
    }

    if (
      trackRef === null ||
      !trackRef.valid ||
      trackRef.handle === null ||
      trackRef.kind !== 'TrackRef'
    ) {
      asyncJobStore.reject(promiseId, 'missing-track-ref');
      scenarioChainLog('async-job', 'rejected', {
        promiseId,
        kind,
        reason: 'missing-track-ref',
      });
      return;
    }

    const trackId = parseTrackIdFromHandle(trackRef.handle);
    if (trackId === null) {
      asyncJobStore.reject(promiseId, 'bad-track-handle');
      scenarioChainLog('async-job', 'rejected', {
        promiseId,
        kind,
        reason: 'bad-track-handle',
        handle: trackRef.handle,
      });
      return;
    }

    const journalItems = getDefaultLiveJournalService().getSnapshot().items;
    const existing = findTrackForReport(journalItems, trackId);
    if (existing?.kind === 'track' && existing.track !== undefined) {
      asyncJobStore.resolve(promiseId);
      scenarioChainLog('async-job', 'resolved', {
        promiseId,
        kind,
        trackId,
        reason: 'already-in-journal',
      });
      return;
    }

    const pending = this.pendingTrackUploads.get(trackId);
    if (pending === undefined) {
      asyncJobStore.reject(promiseId, 'pending-track-not-found');
      scenarioChainLog('async-job', 'rejected', {
        promiseId,
        kind,
        trackId,
        reason: 'pending-track-not-found',
      });
      return;
    }

    setScenarioTraceNodeId(correlation.nodeId);
    void this.uploadTrackAsync({
      ...pending,
      nodeId: correlation.nodeId,
      promiseId,
      asyncJobStore,
    });
  }

  private async uploadTrackAsync(options: {
    readonly nodeId: string;
    readonly trackId: string;
    readonly title: string;
    readonly blob: Blob;
    readonly durationSec: number;
    readonly sampleRate: number;
    readonly captureFormat: ScenarioCaptureFormat;
    readonly promiseId?: string;
    readonly asyncJobStore?: AsyncJobStore;
  }): Promise<void> {
    const {
      nodeId,
      trackId,
      title,
      blob,
      durationSec,
      sampleRate,
      captureFormat,
      promiseId,
      asyncJobStore,
    } = options;
    const createdAtIso = new Date().toISOString();
    const mediaSvc = getDefaultMediaLibraryService();
    await mediaSvc.init();
    const mediaSnap = mediaSvc.getSnapshot();
    const mediaStorageMode = resolveMediaLibraryStorageMode(mediaSnap.quota);

    if (blob.size === 0) {
      const emptyDetail = 'Empty capture blob (EMPTY_BLOB)';
      scenarioChainLog('media', 'upload-failed', {
        nodeId,
        trackId,
        storageMode: mediaStorageMode,
        captureFormat,
        mimeType: blob.type,
        error: emptyDetail,
        durationSec: durationSec.toFixed(3),
      });
      if (promiseId !== undefined && asyncJobStore !== undefined) {
        asyncJobStore.reject(promiseId, emptyDetail);
        scenarioChainLog('async-job', 'rejected', {
          promiseId,
          kind: 'track-upload',
          trackId,
          error: emptyDetail,
        });
      }
      return;
    }

    scenarioChainLog('media', 'upload-start', {
      nodeId,
      trackId,
      title,
      collectionId: BUFFER_COLLECTION_ID,
      storageMode: mediaStorageMode,
      serverReachable: mediaSnap.quota.serverReachable ?? null,
      captureFormat,
      mimeType: blob.type,
      blobBytes: blob.size,
      durationSec: durationSec.toFixed(3),
      sampleRate,
    });

    try {
      const imported = await mediaSvc.importBlob(
        BUFFER_COLLECTION_ID,
        blob,
        {
          title,
          class: 'buffer',
          label: 'unlabeled',
          source: 'mic-recording',
          durationSec,
          sampleRate,
          channels: 1,
          notes: buildRecordingUploadNotes(nodeId, captureFormat),
        },
        { skipRefresh: true },
      );

      scenarioChainLog('media', 'upload-ok', {
        nodeId,
        trackId,
        sampleId: imported.id,
        storageMode: mediaStorageMode,
        captureFormat,
        mimeType: blob.type,
        sizeBytes: imported.sizeBytes,
        durationSec: durationSec.toFixed(3),
      });

      const service = getDefaultLiveJournalService();
      await service.appendTrack({
        clientEntryId: liveJournalTrackClientEntryId(trackId),
        moduleId: DEVICE_BOARD_MODULE_ID,
        moduleName: LIVE_JOURNAL_MODULE_NAME,
        tags: ['device-board:collect', 'scenario:make-track'],
        track: {
          schema: TELEMETRY_TRACK_SCHEMA_VERSION,
          trackId,
          sampleId: imported.id,
          title,
          durationSec,
          sampleRate,
          captureMode: 'auto',
          createdAtIso,
        },
      });

      scenarioChainLog('track', 'done', {
        nodeId,
        trackId,
        sampleId: imported.id,
        journalItemCount: service.getSnapshot().items.length,
      });
      this.pendingTrackUploads.delete(trackId);
      if (promiseId !== undefined && asyncJobStore !== undefined) {
        asyncJobStore.resolve(promiseId);
        scenarioChainLog('async-job', 'resolved', {
          promiseId,
          kind: 'track-upload',
          trackId,
          sampleId: imported.id,
        });
      }
    } catch (err) {
      const detail =
        err instanceof DomainError
          ? `${err.message} (${err.code})`
          : err instanceof Error
            ? err.message
            : String(err);
      scenarioChainLog('media', 'upload-failed', {
        nodeId,
        trackId,
        storageMode: mediaStorageMode,
        captureFormat,
        mimeType: blob.type,
        error: detail,
        durationSec: durationSec.toFixed(3),
      });
      if (promiseId !== undefined && asyncJobStore !== undefined) {
        asyncJobStore.reject(promiseId, detail);
        scenarioChainLog('async-job', 'rejected', {
          promiseId,
          kind: 'track-upload',
          trackId,
          error: detail,
        });
      }
    }
  }

  /** v0.5/v0.6: FftFrameRef[] → in-memory FftTrendAnalysisRef (journal report через PublishReport). */
  async analyzeFftTrendsFromFrameRefs(
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
    policy: ScenarioFftTrendsPolicy,
  ): Promise<{ readonly analysisId: string; readonly detection: ScenarioDetectionResult } | null> {
    scenarioChainLog('analysis', 'fft-trends-start', {
      nodeId,
      frameRefCount: refs.length,
      frameIds: refs.map((ref) => ref.handle),
      measurementsCount: policy.measurementsCount,
      intervalMs: policy.intervalMs,
      detectionMode: policy.detectionMode,
    });

    const frameSummaries: Array<Record<string, unknown>> = [];
    const frameInputs: Array<{
      computedAtIso: string;
      spectralCentroidHz: number;
      flux: number;
      rms: number;
    }> = [];
    for (const ref of refs) {
      if (!ref.valid || ref.handle === null || ref.kind !== 'FftFrameRef') {
        continue;
      }
      const frameMeta = this.fftFramePayloads.get(ref.handle);
      if (frameMeta === undefined) {
        frameSummaries.push({ frameId: ref.handle, missing: true });
        continue;
      }
      frameSummaries.push({
        frameId: ref.handle,
        rms: frameMeta.rms.toFixed(6),
        dominantHz: frameMeta.dominantHz.toFixed(1),
        flux: frameMeta.flux.toFixed(6),
        sampleId: frameMeta.sampleHandle,
      });
      frameInputs.push({
        computedAtIso: frameMeta.computedAtIso,
        spectralCentroidHz: frameMeta.spectralCentroidHz,
        flux: frameMeta.flux,
        rms: frameMeta.rms,
      });
    }

    const startedAt = Date.now();
    const analysis = analyzeTrendsFromFftFrames(frameInputs, { policy });
    if (analysis === null) {
      scenarioChainLog('analysis', 'fft-trends-abort', {
        nodeId,
        reason: frameInputs.length === 0 ? 'empty-frames' : 'insufficient-subsample',
        frameSummaries,
        policyMeasurementsCount: policy.measurementsCount,
        policyIntervalMs: policy.intervalMs,
      });
      return null;
    }

    scenarioChainLog('analysis', 'fft-trends-input', {
      nodeId,
      frameSummaries,
      metricSampleCount: analysis.metricSampleCount,
      peakRms: analysis.rawLevel.toFixed(6),
      source: 'fft-frame-metrics',
      policyMeasurementsCount: policy.measurementsCount,
      policyIntervalMs: policy.intervalMs,
    });

    const finishedAt = Date.now();
    const reportId = createEntryId('trends');
    const report = buildTrendsFftReport({
      reportId,
      startedAt,
      finishedAt,
      intervalMs: analysis.policy.intervalMs,
      measurementsCount: analysis.policy.measurementsCount,
      mode: analysis.policy.detectionMode,
      result: analysis.result,
    });

    this.fftTrendAnalyses.set(reportId, report);

    this.lastDetection = {
      detected: analysis.result.isDetected,
      confidence: analysis.result.confidence,
      soundClass: analysis.result.class,
      isDrone: analysis.result.isDrone,
      templateId: analysis.result.detectedState,
      rawLevel: analysis.rawLevel,
    };

    scenarioChainLog('analysis', 'fft-trends-done', {
      nodeId,
      analysisId: reportId,
      frameCount: refs.length,
      detected: this.lastDetection.detected,
      confidence: this.lastDetection.confidence,
      templateId: this.lastDetection.templateId,
      rawLevel: this.lastDetection.rawLevel,
      elapsedMs: finishedAt - startedAt,
    });

    return {
      analysisId: reportId,
      detection: this.lastDetection,
    };
  }

  /**
   * basn-4 (#323): тренд «дистанции» alarm-loop. Мост копит серии (громкость
   * из evaluateSoundLevel + combinedScore) per nodeId и зовёт ЧИСТЫЙ
   * classifyProximityTrend из core. История сбрасывается на scenario-run-start.
   */
  async evaluateProximityTrend(
    nodeId: string,
    input: { readonly combinedScore: number | null },
  ): Promise<ProximityTrendResult | null> {
    setScenarioTraceNodeId(nodeId);
    const level = await this.evaluateSoundLevel();
    let history = this.proximityHistory.get(nodeId);
    if (history === undefined) {
      history = { loudness: [], scores: [] };
      this.proximityHistory.set(nodeId, history);
    }
    history.loudness.push(level.rawLevel);
    if (history.loudness.length > 64) history.loudness.shift();
    if (input.combinedScore !== null) {
      history.scores.push(input.combinedScore);
      if (history.scores.length > 16) history.scores.shift();
    }
    const result = classifyProximityTrend({
      loudnessSeries: history.loudness,
      scoreSeries: history.scores,
    });
    scenarioChainLog('analysis', 'proximity-tick', {
      nodeId,
      rawLevel: level.rawLevel.toFixed(5),
      combinedScore: input.combinedScore,
      trend: result.trend,
      ready: result.ready,
    });
    return result;
  }

  /**
   * Сброс per-run состояния на scenario-run-start: история proximity + кэш
   * combined-отчётов + окна is-window-elapsed (PC-2 — новый ран стартует окна
   * заново, иначе первый гейт нового рана сработал бы по протухшей точке отсчёта).
   */
  resetProximityHistory(): void {
    this.proximityHistory.clear();
    this.combinedReportCache.clear();
    this.windowElapsedStartMs.clear();
  }

  /**
   * basn-5 (#323): единый combined-отчёт — синхронный конструктор (консилиум т.4).
   * ИДЕМПОТЕНТЕН по хэшу входов (sorted analysis handles + track): повторы
   * alarm-loop возвращают тот же ReportRef, дубли не плодятся. Слияние
   * confidence считает core fuseDetectorConfidences (не бинарный OR).
   */
  async makeCombinedReport(
    reporterRef: ScenarioReferenceValue,
    input: {
      readonly analyses: readonly {
        readonly handle: string;
        readonly kind: string;
        readonly detection: ScenarioDetectionResult;
      }[];
      readonly trackHandle: string | null;
    },
  ): Promise<ScenarioReportPayload | null> {
    if (input.analyses.length === 0) {
      return null;
    }
    const idempotencyKey = `${[...input.analyses.map((a) => a.handle)].sort().join('|')}::${input.trackHandle ?? 'none'}`;
    const cached = this.combinedReportCache.get(idempotencyKey);
    if (cached !== undefined) {
      scenarioChainLog('report', 'combined-reuse', {
        reportId: cached.reportId,
        key: idempotencyKey,
      });
      return cached;
    }
    const fusion = fuseDetectorConfidences(
      input.analyses.map((a) => ({
        name: a.handle,
        family: a.kind === 'EnsembleAnalysisRef' ? 'ensemble' : 'dsp',
        confidence: a.detection.confidence,
        isDrone: a.detection.isDrone ?? a.detection.detected,
      })),
    );
    const trackId =
      input.trackHandle !== null && input.trackHandle.startsWith(`${TRACK_REF_HANDLE_PREFIX}:`)
        ? input.trackHandle.slice(TRACK_REF_HANDLE_PREFIX.length + 1)
        : input.trackHandle ?? 'none';
    const isDetected = fusion.presentCount > 0 && fusion.combinedScore >= 0.5;
    const payload = createScenarioReportPayload({
      schema: 'combined-detection/v1',
      reportId: createEntryId('combined'),
      trackId,
      isDetected,
      summaryText: `combined ${fusion.combinedScore.toFixed(2)} (${input.analyses.length} детектора, agreement ${fusion.agreement.toFixed(2)})`,
      payload: {
        combinedScore: fusion.combinedScore,
        agreement: fusion.agreement,
        perDetector: input.analyses.map((a) => ({
          handle: a.handle,
          kind: a.kind,
          confidence: a.detection.confidence,
          detected: a.detection.detected,
        })),
        trackHandle: input.trackHandle,
      },
    });
    this.combinedReportCache.set(idempotencyKey, payload);
    scenarioChainLog('report', 'combined-built', {
      reportId: payload.reportId,
      reporter: reporterRef.handle,
      combinedScore: fusion.combinedScore.toFixed(4),
      analyses: input.analyses.length,
      track: input.trackHandle,
    });
    return payload;
  }

  /** basn-1 (#323): AudioSampleRef[] окно → DSP-ансамбль (EnsembleProducer) → EnsembleAnalysisRef. */
  async makeEnsembleAnalysisFromSampleRefs(
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
  ): Promise<{ readonly analysisId: string; readonly detection: ScenarioDetectionResult } | null> {
    setScenarioTraceNodeId(nodeId);
    const startedAt = Date.now();
    const payloads: AudioSamplePayload[] = [];
    for (const ref of refs) {
      if (!ref.valid || ref.handle === null || ref.kind !== 'AudioSampleRef') {
        continue;
      }
      const payload = this.audioSamplePayloads.get(ref.handle);
      if (payload !== undefined) {
        payloads.push(payload);
      }
    }
    scenarioChainLog('analysis', 'ensemble-start', {
      nodeId,
      sampleRefCount: refs.length,
      payloadCount: payloads.length,
    });
    const concat = concatAudioSamplePayloads(payloads);
    if (concat === null) {
      scenarioChainLog('analysis', 'ensemble-skip', { nodeId, reason: 'no-audio-payloads' });
      return null;
    }
    // Слияние ансамбля считает detection-ensemble-service (магистраль S2, PR #317);
    // сырой combinedScore идёт в detection.confidence — fusion-узел сливает сырые
    // confidence, не бинарные вердикты (ND3).
    const producer = new EnsembleProducer(createCombinedStreamDetectors(), { smoothing: 1 });
    const result = await producer.analyze({
      samples: concat.samples,
      sampleRate: concat.sampleRate,
      timestamp: startedAt,
      durationSec: concat.durationSec,
    });
    const detected = result.presentCount > 0 && result.combinedScore >= 0.5;
    const detection: ScenarioDetectionResult = {
      detected,
      confidence: result.combinedScore,
      isDrone: detected,
    };
    const analysisId = createEntryId('ensemble');
    scenarioChainLog('analysis', 'ensemble-done', {
      nodeId,
      analysisId,
      presentCount: result.presentCount,
      combinedScore: result.combinedScore.toFixed(4),
      agreement: result.agreement.toFixed(4),
      elapsedMs: Date.now() - startedAt,
    });
    return { analysisId, detection };
  }

  /** v0.6 DBJ3: TrackRef → drone-detection ScenarioReportPayload (без append в journal). */
  async makeReportFromTrack(
    _reporterRef: ScenarioReferenceValue,
    trackRef: ScenarioReferenceValue,
  ): Promise<ScenarioReportPayload | null> {
    if (!trackRef.valid || trackRef.handle === null || trackRef.kind !== 'TrackRef') {
      scenarioChainLog('report', 'drone-skip', { reason: 'invalid-track-ref', kind: trackRef.kind });
      return null;
    }
    const trackId = parseTrackIdFromHandle(trackRef.handle);
    if (trackId === null) {
      scenarioChainLog('report', 'drone-skip', { reason: 'bad-track-handle', handle: trackRef.handle });
      return null;
    }
    const journalItems = getDefaultLiveJournalService().getSnapshot().items;
    const trackItem = findTrackForReport(journalItems, trackId);
    if (trackItem?.kind !== 'track' || trackItem.track === undefined) {
      scenarioChainLog('report', 'drone-skip', {
        reason: 'track-not-in-journal',
        trackId,
        journalItemCount: journalItems.length,
      });
      return null;
    }
    const { sampleId, title } = trackItem.track;
    scenarioChainLog('report', 'drone-analysis-start', { trackId, sampleId, title });
    const { report } = await analyzeSampleDetectors(sampleId, title ?? null);
    const isDetected = isDroneDetectionConsensus(report);
    const payload = createScenarioReportPayload({
      schema: DRONE_DETECTION_REPORT_SCHEMA_VERSION,
      reportId: report.meta.reportId,
      trackId,
      isDetected,
      summaryText: buildDroneDetectionSummaryText(report, isDetected),
      payload: { report },
    });
    scenarioChainLog('report', 'drone-analysis-done', {
      trackId,
      sampleId,
      reportId: payload.reportId,
      isDetected,
      summaryText: payload.summaryText,
      sampleDurationSec: report.meta.sampleDurationSec,
    });
    return payload;
  }

  /** v0.6 DBJ3: FftTrendAnalysisRef → trends FFT ScenarioReportPayload (без append). */
  async makeReportFromAnalysis(
    _reporterRef: ScenarioReferenceValue,
    analysisRef: ScenarioReferenceValue,
  ): Promise<ScenarioReportPayload | null> {
    if (!analysisRef.valid || analysisRef.handle === null || analysisRef.kind !== 'FftTrendAnalysisRef') {
      scenarioChainLog('report', 'trends-skip', { reason: 'invalid-analysis-ref', kind: analysisRef.kind });
      return null;
    }
    const analysisId = parseAnalysisIdFromHandle(analysisRef.handle);
    if (analysisId === null) {
      scenarioChainLog('report', 'trends-skip', { reason: 'bad-analysis-handle', handle: analysisRef.handle });
      return null;
    }
    const fftReport = this.fftTrendAnalyses.get(analysisId);
    if (fftReport === undefined) {
      scenarioChainLog('report', 'trends-skip', { reason: 'analysis-not-found', analysisId });
      return null;
    }
    const payload = createTrendsFftScenarioReportPayload(DEVICE_BOARD_MODULE_ID, fftReport);
    scenarioChainLog('report', 'trends-report-done', {
      analysisId,
      reportId: payload.reportId,
      schema: payload.schema,
      isDetected: payload.isDetected,
      summaryText: payload.summaryText,
    });
    return payload;
  }

  /**
   * ADR-0006 PC-1: честный отчёт одиночного НЕЙРО-детектора (EnsembleAnalysisRef).
   * Детекция резолвится исполнителем из ensembleStore и приходит готовой. Схема
   * `neuro-detection/v1`, summary БЕЗ слова «combined» — одна модальность.
   */
  async makeReportFromEnsembleAnalysis(
    _reporterRef: ScenarioReferenceValue,
    input: { readonly handle: string; readonly detection: ScenarioDetectionResult },
  ): Promise<ScenarioReportPayload | null> {
    const { detection } = input;
    const isDetected = detection.isDrone ?? detection.detected;
    // Синтетический trackId выводится из reportId (паттерн trendsFftSyntheticTrackId):
    // у нейро-отчёта нет реального трека, но журналу нужен непустой стабильный id.
    const reportId = createEntryId('neuro');
    const payload = createScenarioReportPayload({
      schema: 'neuro-detection/v1',
      reportId,
      trackId: `neuro-detection:${reportId}`,
      isDetected,
      summaryText: `нейро ${detection.confidence.toFixed(2)}${isDetected ? ' (дрон)' : ''}`,
      payload: {
        confidence: detection.confidence,
        detected: detection.detected,
        isDrone: detection.isDrone ?? null,
        soundClass: detection.soundClass ?? null,
        analysisHandle: input.handle,
      },
    });
    scenarioChainLog('report', 'neuro-report-done', {
      analysisHandle: input.handle,
      reportId: payload.reportId,
      schema: payload.schema,
      isDetected: payload.isDetected,
      summaryText: payload.summaryText,
    });
    return payload;
  }

  /**
   * PC-2 (is-window-elapsed): периодический гейт окна по host-часам БЕЗ рекордера.
   * Первый вызов на nodeId стартует окно (false); при elapsed >= windowMs → true +
   * сброс окна (самосбрасывающееся, периодическое). Владелец времени — host-часы.
   */
  isWindowElapsed(nodeId: string, windowMs: number): boolean {
    const now = Date.now();
    const startedAt = this.windowElapsedStartMs.get(nodeId);
    if (startedAt === undefined) {
      this.windowElapsedStartMs.set(nodeId, now);
      return false;
    }
    if (now - startedAt >= windowMs) {
      this.windowElapsedStartMs.set(nodeId, now);
      return true;
    }
    return false;
  }

  /** v0.6 DBJ4: append ScenarioReportPayload в LiveJournal по JournalRef scope. */
  async publishReport(
    journalRef: ScenarioReferenceValue,
    payload: ScenarioReportPayload,
  ): Promise<boolean> {
    if (!journalRef.valid || journalRef.handle === null || journalRef.kind !== 'JournalRef') {
      scenarioChainLog('journal', 'publish-skip', { reason: 'invalid-journal-ref', kind: journalRef.kind });
      return false;
    }
    const parsed = parseJournalRefHandle(journalRef.handle);
    if (parsed === null) {
      scenarioChainLog('journal', 'publish-skip', { reason: 'bad-journal-handle', handle: journalRef.handle });
      return false;
    }

    const { mode, pairing } = useNodeConnectionStore.getState();
    scenarioChainLog('journal', 'publish-start', {
      journal: journalRef.handle,
      scope: parsed.scope,
      deviceId: parsed.deviceId,
      reportId: payload.reportId,
      schema: payload.schema,
      isDetected: payload.isDetected,
      summaryText: payload.summaryText,
      connectionMode: mode,
      paired: pairing !== null,
    });

    if (
      parsed.scope === 'server' &&
      mode === 'paired' &&
      pairing !== null &&
      getDefaultLiveJournalService().getSnapshot().storageMode !== 'remote-server'
    ) {
      scenarioChainLog('journal', 'reconfigure-for-server', {
        mediaApiUrl: pairing.mediaApiUrl,
        deviceId: pairing.deviceId,
      });
      await reconfigureJournalFromConnection(mode, pairing);
    }

    const journalBefore = getDefaultLiveJournalService().getSnapshot();
    const tags = [
      'device-board:publish-report',
      `journal-scope:${parsed.scope}`,
      `device-id:${parsed.deviceId}`,
    ];
    if (payload.isDetected) {
      tags.push(LIVE_JOURNAL_DETECTION_TAG);
    }

    await getDefaultLiveJournalService().appendReport({
      clientEntryId: liveJournalReportClientEntryId(payload.reportId),
      moduleId: DEVICE_BOARD_MODULE_ID,
      moduleName: LIVE_JOURNAL_MODULE_NAME,
      tags,
      report: {
        schema: payload.schema,
        reportId: payload.reportId,
        trackId: payload.trackId,
        isDetected: payload.isDetected,
        summaryText: payload.summaryText,
        payload: payload.payload,
      },
    });

    const journalAfter = getDefaultLiveJournalService().getSnapshot();
    scenarioChainLog('journal', 'publish-done', {
      journal: journalRef.handle,
      scope: parsed.scope,
      deviceId: parsed.deviceId,
      reportId: payload.reportId,
      schema: payload.schema,
      storageMode: journalAfter.storageMode,
      itemCountBefore: journalBefore.items.length,
      itemCountAfter: journalAfter.items.length,
    });
    return true;
  }

  getCollectorQueueDepth(
    kind: 'recorder' | 'spectral-analyser',
    deviceHandle: string,
  ): number {
    if (kind === 'recorder') {
      return this.collectorRegistry.getOrCreateRecorder(deviceHandle).queueDepth;
    }
    return this.collectorRegistry.getOrCreateSpectralAnalyser(deviceHandle).queueDepth;
  }

  async startAudioStreaming(microphone: ScenarioReferenceValue | null): Promise<void> {
    if (microphone !== null && microphone.valid && microphone.handle !== null && microphone.handle.length > 0) {
      this.selectedDeviceId = microphone.handle;
    }
    await this.startStreamInternal();
    const devicePart = this.selectedDeviceId || 'default';
    this.audioStreamHandle = `stream:${devicePart}`;
    this.audioStreamMicrophoneId = devicePart;
    this.audioStreamStartedAtIso = new Date().toISOString();
    this.audioStreamValid = true;
    try {
      const stream = await this.resolveActiveStream();
      await this.ensureStreamCaptureSampler(stream);
      scenarioChainLog('stream', 'capture-sampler-ready', {
        handle: this.audioStreamHandle,
        trackCount: stream.getAudioTracks().length,
        trackEnabled: stream.getAudioTracks()[0]?.enabled ?? null,
        trackMuted: stream.getAudioTracks()[0]?.muted ?? null,
        trackReadyState: stream.getAudioTracks()[0]?.readyState ?? null,
      });
    } catch (err) {
      scenarioChainLog('stream', 'capture-sampler-deferred', {
        handle: this.audioStreamHandle,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
    scenarioChainLog('stream', 'startAudioStreaming', {
      handle: this.audioStreamHandle,
      microphoneId: this.audioStreamMicrophoneId,
      usesCoordinator: this.usesCoordinator,
    });
  }

  async stopAudioStreaming(microphone: ScenarioReferenceValue | null): Promise<void> {
    if (microphone !== null && microphone.valid && microphone.handle !== null && microphone.handle.length > 0) {
      const expectedHandle = `stream:${microphone.handle}`;
      if (!this.audioStreamValid || this.audioStreamHandle !== expectedHandle) {
        scenarioRuntimeInfo('[device-board] stopAudioStreaming skipped — microphone mismatch', {
          expected: expectedHandle,
          active: this.audioStreamHandle,
        });
        return;
      }
    }
    await this.stopStreamInternal();
    this.cancelAllActiveClipRecorders();
    this.recordingSessions.clear();
    this.audioStreamValid = false;
    this.audioStreamStartedAtIso = null;
    this.audioSampleByNode.clear();
    this.audioSamplePayloads.clear();
    this.fftFrameByNode.clear();
    this.fftFramePayloads.clear();
    this.windowElapsedStartMs.clear();
    this.collectorRegistry.resetAll();
    scenarioChainLog('stream', 'stopAudioStreaming', { handle: this.audioStreamHandle });
  }

  async startStream(): Promise<void> {
    await this.startAudioStreaming(null);
  }

  async stopStream(): Promise<void> {
    await this.stopAudioStreaming(null);
  }

  async captureAudioSample(nodeId: string, streamRef: ScenarioReferenceValue): Promise<void> {
    const active = this.getActiveAudioStreamRef();
    if (
      !streamRef.valid ||
      streamRef.handle === null ||
      !active.valid ||
      streamRef.handle !== active.handle
    ) {
      scenarioChainLog('capture', 'skip', {
        nodeId,
        reason: 'stream-mismatch',
        streamValid: streamRef.valid,
        streamHandle: streamRef.handle,
        activeValid: active.valid,
        activeHandle: active.handle,
      });
      this.audioSampleByNode.set(nodeId, { kind: 'AudioSampleRef', handle: null, valid: false });
      return;
    }

    scenarioChainLog('capture', 'start', { nodeId, streamHandle: active.handle });

    const captureStartedAt = performance.now();
    const stream = await this.resolveActiveStream();
    const samplerReused =
      this.streamCaptureSampler !== null &&
      this.streamCaptureStream === stream &&
      this.streamCaptureSampler.isRunning();
    const sampler = await this.ensureStreamCaptureSampler(stream);
    const frame = await this.waitForSamplerFrame(sampler, SAMPLE_CAPTURE_MS);

    if (frame === null) {
      scenarioChainLog('capture', 'timeout', {
        nodeId,
        timeoutMs: SAMPLE_CAPTURE_MS,
        captureWaitMs: Math.round(performance.now() - captureStartedAt),
        samplerReused,
        streamActive: this.streamCaptureSampler?.isRunning() ?? false,
      });
      this.audioSampleByNode.set(nodeId, { kind: 'AudioSampleRef', handle: null, valid: false });
      return;
    }

    const sampleCount = frame.samples.length;
    const durationMs = sampleCount > 0 ? (sampleCount / frame.sampleRate) * 1000 : 0;
    const captured: AudioSamplePayload = {
      streamHandle: active.handle ?? '',
      microphoneId: this.audioStreamMicrophoneId,
      sampleRate: frame.sampleRate,
      sampleCount,
      durationMs,
      capturedAtIso: new Date().toISOString(),
      rms: frameLoudness(frame.samples),
      samples: new Float32Array(frame.samples),
    };

    const sampleId = createEntryId('sample');
    this.audioSamplePayloads.set(sampleId, captured);
    const sampleRef = createReferenceValue('AudioSampleRef', sampleId);
    this.audioSampleByNode.set(nodeId, sampleRef);
    scenarioChainLog('capture', 'ok', {
      nodeId,
      sampleId,
      samplerReused,
      captureWaitMs: Math.round(performance.now() - captureStartedAt),
      streamActive: this.streamCaptureSampler?.isRunning() ?? false,
      ...samplePayloadSummary(captured),
    });
  }

  async computeFftFrame(nodeId: string, sampleRef: ScenarioReferenceValue): Promise<void> {
    if (!sampleRef.valid || sampleRef.handle === null) {
      scenarioChainLog('fft', 'skip', { nodeId, reason: 'invalid-sample-ref' });
      this.fftFrameByNode.set(nodeId, { kind: 'FftFrameRef', handle: null, valid: false });
      return;
    }

    const sample = this.audioSamplePayloads.get(sampleRef.handle);
    if (sample === undefined) {
      scenarioChainLog('fft', 'skip', { nodeId, reason: 'missing-sample-payload', sampleId: sampleRef.handle });
      this.fftFrameByNode.set(nodeId, { kind: 'FftFrameRef', handle: null, valid: false });
      return;
    }

    const fftSize = Math.min(SOUND_LEVEL_FFT_SIZE, sample.samples.length);
    if (fftSize < 64) {
      scenarioChainLog('fft', 'skip', {
        nodeId,
        reason: 'sample-too-short',
        sampleId: sampleRef.handle,
        sampleCount: sample.sampleCount,
      });
      this.fftFrameByNode.set(nodeId, { kind: 'FftFrameRef', handle: null, valid: false });
      return;
    }

    const window = sample.samples.subarray(0, fftSize);
    const result = this.scenarioFftAnalyzer.analyze(window, sample.sampleRate);
    const frameId = createEntryId('fft');
    this.fftFramePayloads.set(frameId, {
      sampleHandle: sampleRef.handle,
      sampleRate: sample.sampleRate,
      fftSize,
      binCount: Math.floor(fftSize / 2),
      dominantHz: result.centroid,
      spectralCentroidHz: result.centroid,
      flux: result.flux,
      rms: result.rms,
      computedAtIso: new Date().toISOString(),
    });
    const frameRef = createReferenceValue('FftFrameRef', frameId);
    this.fftFrameByNode.set(nodeId, frameRef);
    scenarioChainLog('fft', 'ok', {
      nodeId,
      frameId,
      sampleId: sampleRef.handle,
      fftSize,
      rms: result.rms.toFixed(6),
      dominantHz: result.centroid.toFixed(1),
      inputSampleRms: sample.rms.toFixed(6),
    });
  }

  private async startStreamInternal(): Promise<void> {
    const snapshot = getMicrophoneCaptureSnapshot();
    if (snapshot.isLive) {
      this.usesCoordinator = true;
      scenarioRuntimeInfo('[device-board] startStream via microphone module');
      return;
    }

    try {
      await requestMicrophoneStart();
      this.usesCoordinator = true;
      scenarioRuntimeInfo('[device-board] startStream via coordinator');
      return;
    } catch {
      // Модуль микрофона не смонтирован — свой поток.
    }

    const requestedDeviceId = this.selectedDeviceId;
    const audio: MediaTrackConstraints | true = requestedDeviceId
      ? { deviceId: { exact: requestedDeviceId } }
      : true;
    try {
      this.ownedStream = await acquireMicrophone(audio);
    } catch (err) {
      if (!requestedDeviceId) {
        throw err;
      }
      scenarioChainLog('stream', 'mic-exact-fallback', {
        requestedDeviceId,
        reason: err instanceof Error ? err.message : String(err),
      });
      this.selectedDeviceId = '';
      this.ownedStream = await acquireMicrophone(true);
    }
    publishMicrophoneStream(MICROPHONE_MODULE_ID, this.ownedStream);
    this.usesCoordinator = false;
    scenarioRuntimeInfo('[device-board] startStream via owned MediaStream');
  }

  private async stopStreamCaptureSampler(): Promise<void> {
    if (this.streamCaptureSampler !== null) {
      await this.streamCaptureSampler.stop();
      this.streamCaptureSampler = null;
    }
    this.streamCaptureStream = null;
  }

  private async ensureStreamCaptureSampler(stream: MediaStream): Promise<LiveSampler> {
    if (
      this.streamCaptureSampler !== null &&
      this.streamCaptureStream === stream &&
      this.streamCaptureSampler.isRunning()
    ) {
      scenarioChainLog('stream', 'sampler-reuse', {
        bufferSize: SOUND_LEVEL_FFT_SIZE,
        streamActive: stream.active,
      });
      return this.streamCaptureSampler;
    }

    await this.stopStreamCaptureSampler();
    scenarioChainLog('stream', 'sampler-start', {
      bufferSize: SOUND_LEVEL_FFT_SIZE,
      streamActive: stream.active,
      warmupMs: 48,
    });
    const sampler = new LiveSampler({
      bufferSize: SOUND_LEVEL_FFT_SIZE,
      smoothingTimeConstant: 0.5,
    });
    await sampler.start(stream);
    this.streamCaptureSampler = sampler;
    this.streamCaptureStream = stream;
    // AnalyserNode often returns zeros on the first frames after AudioContext start.
    await waitMs(48);
    scenarioChainLog('stream', 'sampler-warmed', { sampleRate: sampler.getAudioContext()?.sampleRate ?? null });
    return sampler;
  }

  private waitForSamplerFrame(
    sampler: LiveSampler,
    timeoutMs: number,
  ): Promise<AudioSampleFrame | null> {
    return new Promise((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, timeoutMs);
      const onFrame = (frame: AudioSampleFrame) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        sampler.off('frame', onFrame);
        resolve(frame);
      };
      sampler.on('frame', onFrame);
    });
  }

  private async stopStreamInternal(): Promise<void> {
    await this.stopStreamCaptureSampler();
    if (this.usesCoordinator) {
      requestMicrophoneStop();
      scenarioRuntimeInfo('[device-board] stopStream via coordinator');
      return;
    }
    if (this.ownedStream !== null) {
      publishMicrophoneStream(MICROPHONE_MODULE_ID, null);
      releaseMediaStream(this.ownedStream);
      this.ownedStream = null;
      scenarioRuntimeInfo('[device-board] stopStream released owned stream');
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
      scenarioRuntimeInfo('[device-board] recordChunk', {
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
      soundClass: analysis.result.class,
      isDrone: analysis.result.isDrone,
      templateId: analysis.result.detectedState,
      rawLevel: analysis.rawLevel,
    };

    scenarioRuntimeInfo('[device-board] trendsFftDetect', {
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

    scenarioRuntimeInfo('[device-board] evaluateSoundLevel', { rawLevel, isQuietEnough });

    return { rawLevel, isQuietEnough };
  }

  async writeJournal(event: ScenarioJournalEvent): Promise<void> {
    const branchName = event.branch as string;
    if (branchName === 'alarm') {
      scenarioRuntimeInfo('[device-board] writeJournal alarm skipped — use observation bundle on main flush');
      return;
    }

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
            event.branch === 'onStop'
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
            scenarioRuntimeInfo('[device-board] mic track ended');
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
            scenarioRuntimeInfo('[device-board] mic stream reconnected');
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
        scenarioRuntimeInfo('[device-board] mic stream lost');
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

  private resolveActiveStreamSync(): MediaStream | null {
    if (!this.audioStreamValid) {
      return null;
    }
    if (this.ownedStream !== null && this.ownedStream.active) {
      return this.ownedStream;
    }
    if (this.streamCaptureStream !== null && this.streamCaptureStream.active) {
      return this.streamCaptureStream;
    }
    return null;
  }

  private cancelActiveClipRecorder(deviceHandle: string): void {
    const capture = this.activeClipRecorders.get(deviceHandle);
    if (capture === undefined) {
      return;
    }
    this.activeClipRecorders.delete(deviceHandle);
    capture.recorder.cancel();
  }

  private cancelAllActiveClipRecorders(): void {
    for (const deviceHandle of this.activeClipRecorders.keys()) {
      this.cancelActiveClipRecorder(deviceHandle);
    }
  }

  private async resolveActiveStream(): Promise<MediaStream> {
    if (!this.audioStreamValid) {
      throw new Error('Аудиопоток не запущен — выполните StartStreaming');
    }

    if (this.ownedStream !== null && this.ownedStream.active) {
      return this.ownedStream;
    }

    const snapshot = getMicrophoneCaptureSnapshot();
    if (snapshot.isLive) {
      return waitForMicrophoneStream();
    }

    throw new Error('Активный MediaStream недоступен после StartStreaming');
  }
}

export function createScenarioMicJournalBridge(): ScenarioMicJournalBridge {
  return new ScenarioMicJournalBridge();
}

interface RecordingSlicePayload {
  readonly blob: Blob;
  readonly sampleRate: number;
  readonly durationSec: number;
  readonly captureFormat: ScenarioCaptureFormat;
}

interface ActiveClipCapture {
  readonly recorder: ActiveClipRecorder;
  readonly captureFormat: ScenarioCaptureFormat;
  readonly encoder: 'worklet' | 'mediarecorder';
}
