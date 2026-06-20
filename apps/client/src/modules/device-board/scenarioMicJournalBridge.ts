import { createReferenceValue, DomainError, type ScenarioReferenceValue, type ScenarioReportPayload, createScenarioReportPayload, FFT_TREND_ANALYSIS_REF_HANDLE_PREFIX, parseJournalRefHandle, TRACK_REF_HANDLE_PREFIX } from '@membrana/core';
import { scenarioChainLog, scenarioRuntimeInfo } from './scenarioRuntimeInfoGate';
import { setScenarioTraceNodeId } from './scenarioTraceContext';
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
import { startClipRecorder } from '@/plugins/mic-buffer-recorder/clipRecorder';

import { analyzeChunkTrendsFft } from './analyzeChunkTrendsFft';
import { buildTrendsFftReport, type TrendsFftReport } from '@/plugins/trends-fft-analyzer/buildTrendsFftReport';
import {
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

  private fftFrameByNode = new Map<string, ScenarioReferenceValue>();

  private fftFramePayloads = new Map<string, FftFramePayloadMeta>();

  private readonly fftTrendAnalyses = new Map<string, TrendsFftReport>();

  private readonly collectorRegistry: DeviceCollectorRegistry = createDeviceCollectorRegistry();

  /** Reused across main ticks — avoids cold AnalyserNode frames (all zeros). */
  private streamCaptureSampler: LiveSampler | null = null;

  private streamCaptureStream: MediaStream | null = null;

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
  }

  /** v0.5 DBC4: concat AudioSampleRef[] → LiveJournal track. */
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
        scenarioChainLog('track', 'skip-ref', {
          nodeId,
          reason: 'invalid-ref',
          kind: ref.kind,
          valid: ref.valid,
          handle: ref.handle,
        });
        continue;
      }
      const payload = this.audioSamplePayloads.get(ref.handle);
      if (payload === undefined) {
        scenarioChainLog('track', 'skip-ref', {
          nodeId,
          reason: 'missing-payload',
          sampleId: ref.handle,
        });
        continue;
      }
      payloads.push(payload);
    }

    const concat = concatAudioSamplePayloads(payloads);
    if (concat === null) {
      scenarioChainLog('track', 'abort', { nodeId, reason: 'empty-concat', payloadCount: payloads.length });
      return null;
    }

    const trackId = createEntryId('track');
    const titleSuffix = trackId.startsWith('track-')
      ? trackId.slice('track-'.length, 'track-'.length + 12)
      : trackId.slice(0, 12);
    const title = `MakeTrack ${titleSuffix}`;
    const createdAtIso = new Date().toISOString();
    const blob = encodeWavPcm16(concat.samples, concat.sampleRate);
    const peakRms = payloads.reduce((max, payload) => Math.max(max, payload.rms), 0);
    const avgRms =
      payloads.length > 0
        ? payloads.reduce((sum, payload) => sum + payload.rms, 0) / payloads.length
        : 0;
    const mediaSnap = getDefaultMediaLibraryService().getSnapshot();
    const mediaStorageMode = resolveMediaLibraryStorageMode(mediaSnap.quota);

    scenarioChainLog('track', 'concat-ok', {
      nodeId,
      trackId,
      sampleCount: payloads.length,
      durationSec: concat.durationSec.toFixed(3),
      sampleRate: concat.sampleRate,
      peakRms: peakRms.toFixed(6),
      avgRms: avgRms.toFixed(6),
      peakAbs: peakSampleAbs(concat.samples).toFixed(6),
      wavBytes: blob.size,
      perSample: payloads.map((payload, index) => ({
        index,
        sampleId: refs[index]?.handle ?? null,
        ...samplePayloadSummary(payload),
      })),
    });

    scenarioChainLog('media', 'upload-start', {
      nodeId,
      trackId,
      title,
      collectionId: BUFFER_COLLECTION_ID,
      storageMode: mediaStorageMode,
      serverReachable: mediaSnap.quota.serverReachable ?? null,
      wavBytes: blob.size,
      durationSec: concat.durationSec.toFixed(3),
    });

    let imported;
    try {
      imported = await getDefaultMediaLibraryService().importBlob(
        BUFFER_COLLECTION_ID,
        blob,
        {
          title,
          class: 'buffer',
          label: 'unlabeled',
          source: 'mic-recording',
          durationSec: concat.durationSec,
          sampleRate: concat.sampleRate,
          channels: 1,
          notes: `scenario make-track node ${nodeId}`,
        },
        { skipRefresh: true },
      );
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
        error: detail,
        durationSec: concat.durationSec.toFixed(3),
        peakRms: peakRms.toFixed(6),
      });
      throw new Error(
        `MakeTrack: media upload failed — ${detail}. duration=${concat.durationSec.toFixed(2)}s peakRms=${peakRms.toFixed(6)}`,
      );
    }

    scenarioChainLog('media', 'upload-ok', {
      nodeId,
      trackId,
      sampleId: imported.id,
      storageMode: mediaStorageMode,
      sizeBytes: imported.sizeBytes,
    });

    const journalSnap = getDefaultLiveJournalService().getSnapshot();
    scenarioChainLog('journal', 'appendTrack-start', {
      nodeId,
      trackId,
      sampleId: imported.id,
      storageMode: journalSnap.storageMode,
      durationSec: concat.durationSec.toFixed(3),
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

    scenarioChainLog('track', 'done', {
      nodeId,
      trackId,
      sampleId: imported.id,
      journalItemCount: service.getSnapshot().items.length,
    });

    return { trackId };
  }

  /** v0.5/v0.6: FftFrameRef[] → in-memory FftTrendAnalysisRef (journal report через PublishReport). */
  async analyzeFftTrendsFromFrameRefs(
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
  ): Promise<{ readonly analysisId: string; readonly detection: ScenarioDetectionResult } | null> {
    scenarioChainLog('analysis', 'fft-trends-start', {
      nodeId,
      frameRefCount: refs.length,
      frameIds: refs.map((ref) => ref.handle),
    });

    const frameSummaries: Array<Record<string, unknown>> = [];
    const payloads: AudioSamplePayload[] = [];
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
        sampleId: frameMeta.sampleHandle,
      });
      const samplePayload = this.audioSamplePayloads.get(frameMeta.sampleHandle);
      if (samplePayload !== undefined) {
        payloads.push(samplePayload);
      }
    }

    const concat = concatAudioSamplePayloads(payloads);
    if (concat === null) {
      scenarioChainLog('analysis', 'fft-trends-abort', {
        nodeId,
        reason: 'empty-concat',
        frameSummaries,
      });
      return null;
    }

    scenarioChainLog('analysis', 'fft-trends-input', {
      nodeId,
      frameSummaries,
      durationSec: concat.durationSec.toFixed(3),
      peakRms: peakSampleAbs(concat.samples).toFixed(6),
    });

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

    this.fftTrendAnalyses.set(reportId, report);

    this.lastDetection = {
      detected: analysis.result.isDetected,
      confidence: analysis.result.confidence,
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
    const payload = createScenarioReportPayload({
      schema: TRENDS_FFT_JOURNAL_SCHEMA,
      reportId: fftReport.reportId,
      trackId: trendsFftSyntheticTrackId(DEVICE_BOARD_MODULE_ID, fftReport.reportId),
      isDetected: fftReport.isDetected,
      summaryText: buildTrendsFftSummaryText(fftReport),
      payload: { report: fftReport },
    });
    scenarioChainLog('report', 'trends-wrap-done', {
      analysisId,
      reportId: payload.reportId,
      isDetected: payload.isDetected,
      summaryText: payload.summaryText,
    });
    return payload;
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

    if (parsed.scope === 'server' && mode === 'paired' && pairing !== null) {
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
    this.audioStreamValid = false;
    this.audioStreamStartedAtIso = null;
    this.audioSampleByNode.clear();
    this.audioSamplePayloads.clear();
    this.fftFrameByNode.clear();
    this.fftFramePayloads.clear();
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

    const audio: MediaTrackConstraints | true = this.selectedDeviceId
      ? { deviceId: { exact: this.selectedDeviceId } }
      : true;
    this.ownedStream = await acquireMicrophone(audio);
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
