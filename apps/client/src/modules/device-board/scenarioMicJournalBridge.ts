import { createReferenceValue, type ScenarioReferenceValue, type ScenarioReportPayload, createScenarioReportPayload, FFT_TREND_ANALYSIS_REF_HANDLE_PREFIX, parseJournalRefHandle, TRACK_REF_HANDLE_PREFIX } from '@membrana/core';
import { scenarioRuntimeInfo } from './scenarioRuntimeInfoGate';
import {
  createDeviceCollectorRegistry,
  type CollectorSessionFlushSnapshot,
  type DeviceCollectorRegistry,
} from '@membrana/device-board';
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
import { startClipRecorder } from '@/plugins/mic-buffer-recorder/clipRecorder';

import { analyzeChunkTrendsFft } from './analyzeChunkTrendsFft';
import { buildTrendsFftReport, type TrendsFftReport } from '@/plugins/trends-fft-analyzer/buildTrendsFftReport';
import {
  appendTrendsFftJournalReport,
  buildTrendsFftSummaryText,
  TRENDS_FFT_JOURNAL_SCHEMA,
  trendsFftSyntheticTrackId,
} from '@/plugins/trends-fft-analyzer/appendTrendsFftJournalReport';
import { analyzeSampleDetectors } from '@/plugins/sample-library-drone-analysis/analyzeSampleDetectors';
import {
  buildDroneDetectionSummaryText,
  isDroneDetectionConsensus,
} from '@/plugins/sample-library-drone-analysis/droneAnalysisTelemetry';
import { DRONE_DETECTION_REPORT_SCHEMA_VERSION } from '@membrana/detector-report';
import {
  DRONE_TIGHT_TRENDS_INTERVAL_MS,
  DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
} from '@/lib/droneTightCalibration';

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
  readonly rms: number;
  readonly computedAtIso: string;
}

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

function concatAudioSamplePayloads(
  payloads: readonly AudioSamplePayload[],
): { readonly samples: Float32Array; readonly sampleRate: number; readonly durationSec: number } | null {
  if (payloads.length === 0) {
    return null;
  }
  const sampleRate = payloads[0]!.sampleRate;
  const totalLength = payloads.reduce((sum, payload) => sum + payload.samples.length, 0);
  const samples = new Float32Array(totalLength);
  let offset = 0;
  for (const payload of payloads) {
    samples.set(payload.samples, offset);
    offset += payload.samples.length;
  }
  return {
    samples,
    sampleRate,
    durationSec: samples.length / sampleRate,
  };
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

  private fftFrameByNode = new Map<string, ScenarioReferenceValue>();

  private fftFramePayloads = new Map<string, FftFramePayloadMeta>();

  private readonly fftTrendAnalyses = new Map<string, TrendsFftReport>();

  private readonly collectorRegistry: DeviceCollectorRegistry = createDeviceCollectorRegistry();

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
    if (accepted) {
      scenarioRuntimeInfo('[device-board] appendRecorderSample', {
        deviceHandle,
        sampleId: sampleRef.handle,
      });
    }
    return accepted;
  }

  appendSpectralAnalyserFrame(deviceHandle: string, frameRef: ScenarioReferenceValue): boolean {
    const accepted = this.collectorRegistry.appendFrame(deviceHandle, frameRef);
    if (accepted) {
      scenarioRuntimeInfo('[device-board] appendSpectralAnalyserFrame', {
        deviceHandle,
        frameId: frameRef.handle,
      });
    }
    return accepted;
  }

  flushRecorderSession(deviceHandle: string): CollectorSessionFlushSnapshot | null {
    return this.collectorRegistry.flushRecorder(deviceHandle);
  }

  flushSpectralAnalyserSession(deviceHandle: string): CollectorSessionFlushSnapshot | null {
    return this.collectorRegistry.flushSpectralAnalyser(deviceHandle);
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
  }

  /** v0.5 DBC4: concat AudioSampleRef[] → LiveJournal track. */
  async createTrackFromSampleRefs(
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
  ): Promise<{ readonly trackId: string } | null> {
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

    const concat = concatAudioSamplePayloads(payloads);
    if (concat === null) {
      return null;
    }

    const trackId = createEntryId('track');
    const title = `NewTrack ${trackId.slice(0, 8)}`;
    const createdAtIso = new Date().toISOString();
    const blob = encodeWavPcm16(concat.samples, concat.sampleRate);
    const imported = await getDefaultMediaLibraryService().importBlob(BUFFER_COLLECTION_ID, blob, {
      title,
      class: 'buffer',
      label: 'unlabeled',
      source: 'mic-recording',
      durationSec: concat.durationSec,
      sampleRate: concat.sampleRate,
      channels: 1,
      notes: `scenario new-track node ${nodeId}`,
    });
    const service = getDefaultLiveJournalService();
    await service.appendTrack({
      clientEntryId: liveJournalTrackClientEntryId(trackId),
      moduleId: DEVICE_BOARD_MODULE_ID,
      moduleName: LIVE_JOURNAL_MODULE_NAME,
      tags: ['device-board:collect', 'scenario:new-track'],
      track: {
        schema: TELEMETRY_TRACK_SCHEMA_VERSION,
        trackId,
        sampleId: imported.id,
        title,
        durationSec: concat.durationSec,
        sampleRate: concat.sampleRate,
        captureMode: 'auto',
        createdAtIso,
      },
    });

    scenarioRuntimeInfo('[device-board] createTrackFromSampleRefs', {
      nodeId,
      trackId,
      sampleCount: payloads.length,
      durationSec: concat.durationSec,
    });

    return { trackId };
  }

  /** v0.5 DBC4: FftFrameRef[] → trends FFT analysis + journal report. */
  async analyzeFftTrendsFromFrameRefs(
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
  ): Promise<ScenarioDetectionResult> {
    const payloads: AudioSamplePayload[] = [];
    for (const ref of refs) {
      if (!ref.valid || ref.handle === null || ref.kind !== 'FftFrameRef') {
        continue;
      }
      const frameMeta = this.fftFramePayloads.get(ref.handle);
      if (frameMeta === undefined) {
        continue;
      }
      const samplePayload = this.audioSamplePayloads.get(frameMeta.sampleHandle);
      if (samplePayload !== undefined) {
        payloads.push(samplePayload);
      }
    }

    const concat = concatAudioSamplePayloads(payloads);
    if (concat === null) {
      return { detected: false, confidence: 0, templateId: 'UNKNOWN' };
    }

    const startedAt = Date.now();
    const analysis = analyzeChunkTrendsFft(concat.samples, concat.sampleRate);
    const finishedAt = Date.now();
    const reportId = createEntryId('trends');
    const report = buildTrendsFftReport({
      reportId,
      startedAt,
      finishedAt,
      intervalMs: DRONE_TIGHT_TRENDS_INTERVAL_MS,
      measurementsCount: DRONE_TIGHT_TRENDS_MEASUREMENTS_COUNT,
      mode: 'auto',
      result: analysis.result,
    });
    await appendTrendsFftJournalReport({ moduleId: DEVICE_BOARD_MODULE_ID, report });

    this.fftTrendAnalyses.set(reportId, report);

    this.lastDetection = {
      detected: analysis.result.isDetected,
      confidence: analysis.result.confidence,
      templateId: analysis.result.detectedState,
      rawLevel: analysis.rawLevel,
    };

    scenarioRuntimeInfo('[device-board] analyzeFftTrendsFromFrameRefs', {
      nodeId,
      reportId,
      frameCount: refs.length,
      detected: this.lastDetection.detected,
      confidence: this.lastDetection.confidence,
    });

    return this.lastDetection;
  }

  /** v0.6 DBJ3: TrackRef → drone-detection ScenarioReportPayload (без append в journal). */
  async makeReportFromTrack(
    _reporterRef: ScenarioReferenceValue,
    trackRef: ScenarioReferenceValue,
  ): Promise<ScenarioReportPayload | null> {
    if (!trackRef.valid || trackRef.handle === null || trackRef.kind !== 'TrackRef') {
      return null;
    }
    const trackId = parseTrackIdFromHandle(trackRef.handle);
    if (trackId === null) {
      return null;
    }
    const trackItem = findTrackForReport(getDefaultLiveJournalService().getSnapshot().items, trackId);
    if (trackItem?.kind !== 'track' || trackItem.track === undefined) {
      return null;
    }
    const { sampleId, title } = trackItem.track;
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
    scenarioRuntimeInfo('[device-board] makeReportFromTrack', {
      trackId,
      reportId: payload.reportId,
      isDetected,
    });
    return payload;
  }

  /** v0.6 DBJ3: FftTrendAnalysisRef → trends FFT ScenarioReportPayload (без append). */
  async makeReportFromAnalysis(
    _reporterRef: ScenarioReferenceValue,
    analysisRef: ScenarioReferenceValue,
  ): Promise<ScenarioReportPayload | null> {
    if (!analysisRef.valid || analysisRef.handle === null || analysisRef.kind !== 'FftTrendAnalysisRef') {
      return null;
    }
    const analysisId = parseAnalysisIdFromHandle(analysisRef.handle);
    if (analysisId === null) {
      return null;
    }
    const fftReport = this.fftTrendAnalyses.get(analysisId);
    if (fftReport === undefined) {
      return null;
    }
    const payload = createScenarioReportPayload({
      schema: TRENDS_FFT_JOURNAL_SCHEMA,
      reportId: fftReport.reportId,
      trackId: trendsFftSyntheticTrackId(DEVICE_BOARD_MODULE_ID, fftReport.reportId),
      isDetected: fftReport.isDetected,
      summaryText: buildTrendsFftSummaryText(fftReport),
      payload: { report: fftReport },
    });
    scenarioRuntimeInfo('[device-board] makeReportFromAnalysis', {
      analysisId,
      reportId: payload.reportId,
      isDetected: payload.isDetected,
    });
    return payload;
  }

  /** v0.6 DBJ4: append ScenarioReportPayload в LiveJournal по JournalRef scope. */
  async publishReport(
    journalRef: ScenarioReferenceValue,
    payload: ScenarioReportPayload,
  ): Promise<boolean> {
    if (!journalRef.valid || journalRef.handle === null || journalRef.kind !== 'JournalRef') {
      return false;
    }
    const parsed = parseJournalRefHandle(journalRef.handle);
    if (parsed === null) {
      return false;
    }

    const { mode, pairing } = useNodeConnectionStore.getState();
    if (parsed.scope === 'server' && mode === 'paired' && pairing !== null) {
      await reconfigureJournalFromConnection(mode, pairing);
    }

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

    scenarioRuntimeInfo('[device-board] publishReport', {
      journal: journalRef.handle,
      scope: parsed.scope,
      deviceId: parsed.deviceId,
      reportId: payload.reportId,
      schema: payload.schema,
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
    scenarioRuntimeInfo('[device-board] startAudioStreaming', { handle: this.audioStreamHandle });
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
    this.audioStreamValid = false;
    this.audioStreamStartedAtIso = null;
    this.audioSampleByNode.clear();
    this.audioSamplePayloads.clear();
    this.fftFrameByNode.clear();
    this.fftFramePayloads.clear();
    this.collectorRegistry.resetAll();
    scenarioRuntimeInfo('[device-board] stopAudioStreaming');
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
      this.audioSampleByNode.set(nodeId, { kind: 'AudioSampleRef', handle: null, valid: false });
      return;
    }

    const stream = await this.resolveActiveStream();
    const sampler = new LiveSampler({
      bufferSize: SOUND_LEVEL_FFT_SIZE,
      smoothingTimeConstant: 0.5,
    });

    let captured: AudioSamplePayload | null = null;

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => resolve(), SAMPLE_CAPTURE_MS);
        sampler.on('frame', (frame) => {
          if (captured === null) {
            const sampleCount = frame.samples.length;
            const durationMs = sampleCount > 0 ? (sampleCount / frame.sampleRate) * 1000 : 0;
            captured = {
              streamHandle: active.handle ?? '',
              microphoneId: this.audioStreamMicrophoneId,
              sampleRate: frame.sampleRate,
              sampleCount,
              durationMs,
              capturedAtIso: new Date().toISOString(),
              rms: frameLoudness(frame.samples),
              samples: new Float32Array(frame.samples),
            };
            clearTimeout(timeout);
            resolve();
          }
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

    if (captured === null) {
      this.audioSampleByNode.set(nodeId, { kind: 'AudioSampleRef', handle: null, valid: false });
      return;
    }

    const sampleId = createEntryId('sample');
    this.audioSamplePayloads.set(sampleId, captured);
    const sampleRef = createReferenceValue('AudioSampleRef', sampleId);
    this.audioSampleByNode.set(nodeId, sampleRef);
    scenarioRuntimeInfo('[device-board] captureAudioSample', { nodeId, sampleId });
  }

  async computeFftFrame(nodeId: string, sampleRef: ScenarioReferenceValue): Promise<void> {
    if (!sampleRef.valid || sampleRef.handle === null) {
      this.fftFrameByNode.set(nodeId, { kind: 'FftFrameRef', handle: null, valid: false });
      return;
    }

    const sample = this.audioSamplePayloads.get(sampleRef.handle);
    if (sample === undefined) {
      this.fftFrameByNode.set(nodeId, { kind: 'FftFrameRef', handle: null, valid: false });
      return;
    }

    const fftSize = Math.min(SOUND_LEVEL_FFT_SIZE, sample.samples.length);
    if (fftSize < 64) {
      this.fftFrameByNode.set(nodeId, { kind: 'FftFrameRef', handle: null, valid: false });
      return;
    }

    const window = sample.samples.subarray(0, fftSize);
    const analyzer = new FftAnalyzer({ fftSize });
    const result = analyzer.analyze(window, sample.sampleRate);
    const frameId = createEntryId('fft');
    this.fftFramePayloads.set(frameId, {
      sampleHandle: sampleRef.handle,
      sampleRate: sample.sampleRate,
      fftSize,
      binCount: Math.floor(fftSize / 2),
      dominantHz: result.centroid,
      spectralCentroidHz: result.centroid,
      rms: result.rms,
      computedAtIso: new Date().toISOString(),
    });
    const frameRef = createReferenceValue('FftFrameRef', frameId);
    this.fftFrameByNode.set(nodeId, frameRef);
    scenarioRuntimeInfo('[device-board] computeFftFrame', { nodeId, frameId, sampleId: sampleRef.handle });
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

    const audio: MediaTrackConstraints | true = this.selectedDeviceId
      ? { deviceId: { exact: this.selectedDeviceId } }
      : true;
    this.ownedStream = await acquireMicrophone(audio);
    publishMicrophoneStream(MICROPHONE_MODULE_ID, this.ownedStream);
    this.usesCoordinator = false;
    scenarioRuntimeInfo('[device-board] startStream via owned MediaStream');
  }

  private async stopStreamInternal(): Promise<void> {
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
