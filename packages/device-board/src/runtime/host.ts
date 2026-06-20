import { createReferenceValue, type ScenarioBlockKind, type ScenarioReferenceValue, type ScenarioReportPayload, type ScenarioVariableValue } from '@membrana/core';

import type { CollectorSessionFlushSnapshot } from './collector-sessions.js';
import type { ScenarioDetectionResult, ScenarioJournalEvent, ScenarioSoundLevelResult } from './types.js';
import type { ScenarioVariableStore } from './variable-store.js';

/** Описание микрофона из enumerate (host → UI dropdown GetMicrophone). */
export interface ScenarioMicrophoneOption {
  readonly deviceId: string;
  readonly label: string;
}

/** Колбэки потери/восстановления соединения (H3b). */
export interface ScenarioConnectionHandlers {
  readonly onDisconnect: () => void;
  readonly onReconnect: () => void;
}

/** Минимальные read-only метаданные ссылочного объекта (server / device / microphone). */
export interface ScenarioResourceMetadata {
  readonly fields: Readonly<Record<string, string>>;
}

/** Параметры ожидания между итерациями main/alarm loop. См. `docs/SCENARIO_RUNTIME.md` §5. */
export interface ScenarioLoopTickWaitOptions {
  readonly pauseMs: number;
  readonly signal: AbortSignal;
}

/** Порты исполнения блоков — реализует `apps/client` (audio, journal, detectors). */
export interface ScenarioRuntimeHost {
  /** Handle подключённого устройства для Event/dataflow (v0.4 DBR4). */
  readonly getDeviceHandle?: () => string | null;
  /** Handle связанного сервера (paired cabinet/media). */
  readonly getServerHandle?: () => string | null;
  /**
   * Узел связан с сервером (device↔server в архитектуре Membrana).
   * onConnect/onDisconnect выполняются только при `true`.
   */
  readonly isDeviceLinked?: () => boolean;
  /**
   * Read-only метаданные ссылочного объекта для Print (адрес сервера, платформа device, label mic).
   * Не редактируются на доске — только резолвятся в рантайме.
   */
  readonly getResourceMetadata?: (
    ref: ScenarioReferenceValue,
  ) => ScenarioResourceMetadata | null | Promise<ScenarioResourceMetadata | null>;
  /** Вывод строки Print в консоль браузера (client); stub — в log. */
  readonly printLine?: (line: string) => void;
  /** Хранилище переменных сценария; stub создаёт in-memory store. */
  readonly variableStore?: ScenarioVariableStore;
  readonly getScenarioVariable?: (id: string) => ScenarioVariableValue | null;
  readonly setScenarioVariable?: (id: string, value: ScenarioVariableValue | null) => void;
  /** Список микрофонов устройства (audio-engine enumerate, DBR5). */
  readonly enumerateMicrophones?: () => Promise<readonly ScenarioMicrophoneOption[]>;
  readonly selectMicrophone: () => Promise<void>;
  /** Запускает аудиопоток (legacy D0 `start-stream` и v0.4 `start-streaming`). */
  readonly startStream: () => Promise<void>;
  /** Останавливает аудиопоток (legacy D0 и v0.4 `stop-streaming`). */
  readonly stopStream: () => Promise<void>;
  /**
   * v0.4 `start-streaming`: явный старт потока; опционально — микрофон из dataflow.
   * Без вызова микрофон не отдаёт аудио.
   */
  readonly startAudioStreaming?: (microphone: ScenarioReferenceValue | null) => Promise<void>;
  /** v0.4 `stop-streaming`: останавливает AudioStream; опционально — микрофон из dataflow. */
  readonly stopAudioStreaming?: (microphone: ScenarioReferenceValue | null) => Promise<void>;
  /** Текущая ссылка на активный AudioStream (для get-audio-stream). */
  readonly getActiveAudioStreamRef?: () => ScenarioReferenceValue;
  /**
   * Захват звукового отрезка из AudioStream (v0.4 `get-sample`, на exec).
   * Результат читается через `getCapturedAudioSampleRef`.
   */
  readonly captureAudioSample?: (
    nodeId: string,
    streamRef: ScenarioReferenceValue,
  ) => Promise<void>;
  /** Последний захваченный AudioSampleRef для узла get-sample. */
  readonly getCapturedAudioSampleRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /**
   * БПФ по AudioSample (v0.4 `get-fft-frame`, на exec).
   * Результат читается через `getCapturedFftFrameRef`.
   */
  readonly computeFftFrame?: (
    nodeId: string,
    sampleRef: ScenarioReferenceValue,
  ) => Promise<void>;
  /** Последний FftFrameRef для узла get-fft-frame. */
  readonly getCapturedFftFrameRef?: (nodeId: string) => ScenarioReferenceValue | null;
  /** v0.5 DBC2: singleton RecorderRef по deviceHandle. */
  readonly getRecorderSessionRef?: (deviceHandle: string) => ScenarioReferenceValue | null;
  /** v0.5 DBC2: singleton SpectralAnalyserRef по deviceHandle. */
  readonly getSpectralAnalyserSessionRef?: (deviceHandle: string) => ScenarioReferenceValue | null;
  /** v0.5 DBC2: append AudioSampleRef в очередь Recorder singleton. */
  readonly appendRecorderSample?: (
    deviceHandle: string,
    sampleRef: ScenarioReferenceValue,
  ) => boolean;
  /** v0.5 DBC2: append FftFrameRef в очередь SpectralAnalyser singleton. */
  readonly appendSpectralAnalyserFrame?: (
    deviceHandle: string,
    frameRef: ScenarioReferenceValue,
  ) => boolean;
  /** v0.5 DBC2: flush очереди Recorder (Collect / terminal nodes). */
  readonly flushRecorderSession?: (
    deviceHandle: string,
  ) => CollectorSessionFlushSnapshot | null;
  /** v0.5 DBC2: flush очереди SpectralAnalyser. */
  readonly flushSpectralAnalyserSession?: (
    deviceHandle: string,
  ) => CollectorSessionFlushSnapshot | null;
  /** v0.5 DBC2: multicast-подписка CollectSamples на Recorder singleton. */
  readonly subscribeRecorderCollect?: (
    deviceHandle: string,
    collectNodeId: string,
  ) => () => void;
  /** v0.5 DBC2: multicast-подписка CollectFftFrames на SpectralAnalyser singleton. */
  readonly subscribeSpectralAnalyserCollect?: (
    deviceHandle: string,
    collectNodeId: string,
  ) => () => void;
  /** v0.5 DBC2: сброс singleton-очередей при load/start сценария (синхрон с CollectRuntimeStore). */
  readonly resetCollectorSessions?: () => void;
  /** v0.6 DBJ1: JournalRef device scope per deviceId. */
  readonly getDeviceJournalRef?: (deviceHandle: string) => ScenarioReferenceValue | null;
  /** v0.6 DBJ1: JournalRef server scope per deviceId (cabinet backend when paired). */
  readonly getServerJournalRef?: (deviceHandle: string) => ScenarioReferenceValue | null;
  /** v0.6 DBJ2: ReporterRef scoped к journal handle (optional host override). */
  readonly getReporterRef?: (journalHandle: string) => ScenarioReferenceValue | null;
  /** v0.6 DBJ3: TrackRef → in-memory ScenarioReportPayload (без append в journal). */
  readonly makeReportFromTrack?: (
    reporterRef: ScenarioReferenceValue,
    trackRef: ScenarioReferenceValue,
  ) => Promise<ScenarioReportPayload | null>;
  /** v0.6 DBJ3: FftTrendAnalysisRef → in-memory ScenarioReportPayload. */
  readonly makeReportFromAnalysis?: (
    reporterRef: ScenarioReferenceValue,
    analysisRef: ScenarioReferenceValue,
  ) => Promise<ScenarioReportPayload | null>;
  /** v0.6 DBJ4: append ScenarioReportPayload в journal по JournalRef scope. */
  readonly publishReport?: (
    journalRef: ScenarioReferenceValue,
    payload: ScenarioReportPayload,
  ) => Promise<boolean>;
  readonly writeJournal: (event: ScenarioJournalEvent) => Promise<void>;
  readonly recordChunk: (options: { readonly durationMs: number }) => Promise<{ readonly clipId: string }>;
  /** v0.5 DBC4: concat AudioSampleRef[] → journal track. */
  readonly createTrackFromSampleRefs?: (
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
  ) => Promise<{ readonly trackId: string } | null>;
  /** v0.5 DBC4: FftFrameRef[] → trends analysis + journal report. */
  readonly analyzeFftTrendsFromFrameRefs?: (
    nodeId: string,
    refs: readonly ScenarioReferenceValue[],
  ) => Promise<ScenarioDetectionResult>;
  readonly trendsFftDetect: () => Promise<ScenarioDetectionResult>;
  readonly evaluateSoundLevel: () => Promise<ScenarioSoundLevelResult>;
  /**
   * Пауза до следующего тика main/alarm. Client может подставить rAF или audio-frame;
   * stub и тесты — wall-clock (`waitMs`). Ядро не вызывает DOM-таймеры напрямую.
   */
  readonly waitUntilNextLoopTick?: (options: ScenarioLoopTickWaitOptions) => Promise<void>;
  readonly log: (message: string, context?: Readonly<Record<string, unknown>>) => void;
  /** Клиент: вкл/выкл служебные INFO-логи (Print не затрагивается). */
  readonly setInfoLoggingEnabled?: (enabled: boolean) => void;
  readonly watchConnection?: (handlers: ScenarioConnectionHandlers) => () => void;
}

/** Заглушка host для тестов и playground. */
export function createStubScenarioRuntimeHost(
  overrides: Partial<ScenarioRuntimeHost> = {},
): ScenarioRuntimeHost {
  const log = overrides.log ?? (() => undefined);
  const variableStore = overrides.variableStore;
  return {
    getDeviceHandle: overrides.getDeviceHandle ?? (() => 'stub-device'),
    getServerHandle: overrides.getServerHandle ?? (() => 'stub-server'),
    isDeviceLinked: overrides.isDeviceLinked ?? (() => true),
    getResourceMetadata:
      overrides.getResourceMetadata ??
      ((ref) => ({
        fields: {
          kind: ref.kind,
          handle: ref.handle ?? 'null',
        },
      })),
    printLine: overrides.printLine ?? ((line) => log(`print: ${line}`)),
    variableStore,
    getScenarioVariable:
      overrides.getScenarioVariable ??
      (variableStore !== undefined ? (id) => variableStore.getValue(id) : undefined),
    setScenarioVariable:
      overrides.setScenarioVariable ??
      (variableStore !== undefined ? (id, value) => variableStore.setValue(id, value) : undefined),
    enumerateMicrophones:
      overrides.enumerateMicrophones ??
      (async () => [{ deviceId: 'default', label: 'Default microphone' }]),
    selectMicrophone: overrides.selectMicrophone ?? (async () => log('selectMicrophone')),
    startStream: overrides.startStream ?? (async () => log('startStream')),
    stopStream: overrides.stopStream ?? (async () => log('stopStream')),
    startAudioStreaming:
      overrides.startAudioStreaming ??
      (async (microphone) => log('startAudioStreaming', { microphone: microphone?.handle })),
    stopAudioStreaming:
      overrides.stopAudioStreaming ??
      (async (microphone) => log('stopAudioStreaming', { microphone: microphone?.handle })),
    getActiveAudioStreamRef:
      overrides.getActiveAudioStreamRef ??
      (() => ({ kind: 'AudioStreamRef', handle: 'stub-stream', valid: true })),
    captureAudioSample:
      overrides.captureAudioSample ??
      (async (nodeId) => {
        log('captureAudioSample', { nodeId });
      }),
    getCapturedAudioSampleRef:
      overrides.getCapturedAudioSampleRef ??
      ((nodeId) => ({ kind: 'AudioSampleRef', handle: `stub-sample-${nodeId}`, valid: true })),
    computeFftFrame:
      overrides.computeFftFrame ??
      (async (nodeId) => {
        log('computeFftFrame', { nodeId });
      }),
    getCapturedFftFrameRef:
      overrides.getCapturedFftFrameRef ??
      ((nodeId) => ({ kind: 'FftFrameRef', handle: `stub-frame-${nodeId}`, valid: true })),
    getRecorderSessionRef:
      overrides.getRecorderSessionRef ??
      ((deviceHandle) =>
        createReferenceValue('RecorderRef', `recorder:${deviceHandle}`)),
    getSpectralAnalyserSessionRef:
      overrides.getSpectralAnalyserSessionRef ??
      ((deviceHandle) =>
        createReferenceValue('SpectralAnalyserRef', `analyser:${deviceHandle}`)),
    appendRecorderSample: overrides.appendRecorderSample ?? (() => true),
    appendSpectralAnalyserFrame: overrides.appendSpectralAnalyserFrame ?? (() => true),
    flushRecorderSession: overrides.flushRecorderSession ?? (() => null),
    flushSpectralAnalyserSession: overrides.flushSpectralAnalyserSession ?? (() => null),
    subscribeRecorderCollect: overrides.subscribeRecorderCollect ?? (() => () => undefined),
    subscribeSpectralAnalyserCollect:
      overrides.subscribeSpectralAnalyserCollect ?? (() => () => undefined),
    resetCollectorSessions: overrides.resetCollectorSessions ?? (() => undefined),
    getDeviceJournalRef:
      overrides.getDeviceJournalRef ??
      ((deviceHandle) => ({
        kind: 'JournalRef',
        handle: `journal:device:${deviceHandle}`,
        valid: true,
      })),
    getServerJournalRef:
      overrides.getServerJournalRef ??
      ((deviceHandle) => ({
        kind: 'JournalRef',
        handle: `journal:server:${deviceHandle}`,
        valid: true,
      })),
    getReporterRef:
      overrides.getReporterRef ??
      ((journalHandle) => ({
        kind: 'ReporterRef',
        handle: `reporter:${journalHandle}`,
        valid: true,
      })),
    makeReportFromTrack:
      overrides.makeReportFromTrack ??
      (async (reporterRef, trackRef) => {
        log('makeReportFromTrack', {
          reporter: reporterRef.handle,
          track: trackRef.handle,
        });
        return {
          schema: 'drone-detection-report/v1',
          reportId: 'stub-report-track',
          trackId: trackRef.handle?.replace('track:', '') ?? 'stub-track',
          isDetected: false,
          payload: {},
        };
      }),
    makeReportFromAnalysis:
      overrides.makeReportFromAnalysis ??
      (async (reporterRef, analysisRef) => {
        log('makeReportFromAnalysis', {
          reporter: reporterRef.handle,
          analysis: analysisRef.handle,
        });
        return {
          schema: 'trends-fft-report/v1',
          reportId: 'stub-report-analysis',
          trackId: 'stub-track',
          isDetected: false,
          payload: {},
        };
      }),
    publishReport:
      overrides.publishReport ??
      (async (journalRef, payload) => {
        log('publishReport', {
          journal: journalRef.handle,
          reportId: payload.reportId,
          schema: payload.schema,
        });
        return true;
      }),
    writeJournal: overrides.writeJournal ?? (async (event) => log('writeJournal', { blockKind: event.blockKind })),
    recordChunk:
      overrides.recordChunk ??
      (async () => {
        log('recordChunk');
        return { clipId: 'stub-clip' };
      }),
    createTrackFromSampleRefs:
      overrides.createTrackFromSampleRefs ??
      (async (nodeId, refs) => {
        log('createTrackFromSampleRefs', { nodeId, count: refs.length });
        return refs.length > 0 ? { trackId: 'stub-track' } : null;
      }),
    analyzeFftTrendsFromFrameRefs:
      overrides.analyzeFftTrendsFromFrameRefs ??
      (async (nodeId, refs) => {
        log('analyzeFftTrendsFromFrameRefs', { nodeId, count: refs.length });
        return {
          detected: false,
          confidence: 0,
          templateId: 'stub',
        };
      }),
    trendsFftDetect:
      overrides.trendsFftDetect ??
      (async () => ({
        detected: false,
        confidence: 0,
        templateId: 'stub',
      })),
    evaluateSoundLevel:
      overrides.evaluateSoundLevel ??
      (async () => ({
        rawLevel: 0.5,
        isQuietEnough: false,
      })),
    waitUntilNextLoopTick: overrides.waitUntilNextLoopTick,
    watchConnection: overrides.watchConnection,
    log,
  };
}

export const SUPPORTED_H2B_BLOCK_KINDS = [
  'select-microphone',
  'start-stream',
  'write-journal',
  'record-chunk',
  'trends-fft-detect',
  'evaluate-sound-level',
  'stop-scenario',
] as const satisfies readonly ScenarioBlockKind[];
