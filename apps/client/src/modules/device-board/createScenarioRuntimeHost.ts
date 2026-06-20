import type { ScenarioReferenceValue } from '@membrana/core';
import { createReferenceValue, formatJournalRefHandle, formatReporterRefHandle, parseJournalRefHandle, parseReporterRefJournalHandle } from '@membrana/core';
import type { ScenarioRuntimeHost } from '@membrana/device-board';
import { waitMs } from '@membrana/device-board';

import { scenarioRuntimeInfo, setScenarioRuntimeInfoLogging } from './scenarioRuntimeInfoGate';

import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import { isDeviceLive } from '@/lib/isDeviceLive';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';

import { createScenarioMicJournalBridge } from './scenarioMicJournalBridge';

function readRuntimeLinkContext(): {
  readonly isLinked: boolean;
  readonly deviceHandle: string | null;
  readonly serverHandle: string | null;
} {
  const { mode, pairing } = useNodeConnectionStore.getState();
  if (mode !== 'paired' || pairing === null) {
    return { isLinked: false, deviceHandle: null, serverHandle: null };
  }
  const wsState = getNodeRealtimeClient().getState();
  const isLinked = isDeviceLive(pairing.deviceId, mode, wsState);
  return {
    isLinked,
    deviceHandle: pairing.deviceId,
    serverHandle: pairing.membraneId,
  };
}

function readDeviceMetadataFields(deviceId: string): Readonly<Record<string, string>> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  return {
    deviceId,
    platform: nav?.platform ?? 'unknown',
    language: nav?.language ?? 'unknown',
    cores: nav?.hardwareConcurrency !== undefined ? String(nav.hardwareConcurrency) : 'unknown',
  };
}

/** Host-порты scenario runtime: mic → chunk → trends FFT → LiveJournal (H2c). */
export function createScenarioRuntimeHost(): ScenarioRuntimeHost {
  const bridge = createScenarioMicJournalBridge();

  return {
    getDeviceHandle: () => readRuntimeLinkContext().deviceHandle,
    getServerHandle: () => readRuntimeLinkContext().serverHandle,
    isDeviceLinked: () => readRuntimeLinkContext().isLinked,
    getResourceMetadata: async (ref: ScenarioReferenceValue) => {
      const { pairing } = useNodeConnectionStore.getState();
      if (ref.kind === 'ServerRef') {
        if (pairing === null) {
          return { fields: { status: 'unpaired' } };
        }
        return {
          fields: {
            membraneId: pairing.membraneId,
            mediaApiUrl: pairing.mediaApiUrl,
            nodeLabel: pairing.nodeLabel,
            nodeId: pairing.nodeId,
          },
        };
      }
      if (ref.kind === 'DeviceRef') {
        const handle = ref.handle ?? readRuntimeLinkContext().deviceHandle ?? 'unknown';
        return { fields: readDeviceMetadataFields(handle) };
      }
      if (ref.kind === 'MicrophoneRef') {
        const handle = ref.handle ?? '';
        const options = await bridge.enumerateMicrophones();
        const match = options.find((item) => item.deviceId === handle);
        return {
          fields: {
            deviceId: handle,
            label: match?.label ?? 'unknown',
          },
        };
      }
      if (ref.kind === 'AudioStreamRef') {
        const handle = ref.handle ?? '';
        const meta = handle.length > 0 ? bridge.getAudioStreamMeta(handle) : null;
        const options = await bridge.enumerateMicrophones();
        const micId = meta?.microphoneId ?? '';
        const micMatch = options.find((item) => item.deviceId === micId);
        const active = bridge.getActiveAudioStreamRef();
        return {
          fields: {
            streamId: handle || 'null',
            status: meta?.active === true && active.handle === handle ? 'streaming' : 'stopped',
            microphoneId: micId || 'unknown',
            microphoneLabel: micMatch?.label ?? 'unknown',
            startedAt: meta?.startedAtIso ?? '—',
          },
        };
      }
      if (ref.kind === 'AudioSampleRef') {
        const handle = ref.handle ?? '';
        const payload = handle.length > 0 ? bridge.getAudioSamplePayloadMeta(handle) : null;
        if (payload === null) {
          return {
            fields: {
              sampleId: handle || 'null',
              status: ref.valid ? 'missing' : 'invalid',
            },
          };
        }
        const options = await bridge.enumerateMicrophones();
        const micMatch = options.find((item) => item.deviceId === payload.microphoneId);
        return {
          fields: {
            sampleId: handle,
            streamId: payload.streamHandle,
            microphoneId: payload.microphoneId,
            microphoneLabel: micMatch?.label ?? 'unknown',
            sampleRate: String(payload.sampleRate),
            sampleCount: String(payload.sampleCount),
            durationMs: payload.durationMs.toFixed(1),
            rms: payload.rms.toFixed(4),
            capturedAt: payload.capturedAtIso,
          },
        };
      }
      if (ref.kind === 'FftFrameRef') {
        const handle = ref.handle ?? '';
        const payload = handle.length > 0 ? bridge.getFftFramePayload(handle) : null;
        if (payload === null) {
          return {
            fields: {
              frameId: handle || 'null',
              status: ref.valid ? 'missing' : 'invalid',
            },
          };
        }
        return {
          fields: {
            frameId: handle,
            sampleId: payload.sampleHandle,
            fftSize: String(payload.fftSize),
            binCount: String(payload.binCount),
            sampleRate: String(payload.sampleRate),
            dominantHz: payload.dominantHz.toFixed(1),
            spectralCentroidHz: payload.spectralCentroidHz.toFixed(1),
            rms: payload.rms.toFixed(4),
            computedAt: payload.computedAtIso,
          },
        };
      }
      if (ref.kind === 'RecorderRef') {
        const handle = ref.handle ?? '';
        const deviceHandle =
          handle.startsWith('recorder:') ? handle.slice('recorder:'.length) : handle;
        const depth =
          deviceHandle.length > 0 ? bridge.getCollectorQueueDepth('recorder', deviceHandle) : 0;
        return {
          fields: {
            sessionId: handle || 'null',
            deviceHandle: deviceHandle || 'unknown',
            queueDepth: String(depth),
            status: ref.valid ? 'active' : 'invalid',
          },
        };
      }
      if (ref.kind === 'SpectralAnalyserRef') {
        const handle = ref.handle ?? '';
        const deviceHandle =
          handle.startsWith('analyser:') ? handle.slice('analyser:'.length) : handle;
        const depth =
          deviceHandle.length > 0
            ? bridge.getCollectorQueueDepth('spectral-analyser', deviceHandle)
            : 0;
        return {
          fields: {
            sessionId: handle || 'null',
            deviceHandle: deviceHandle || 'unknown',
            queueDepth: String(depth),
            status: ref.valid ? 'active' : 'invalid',
          },
        };
      }
      if (ref.kind === 'JournalRef') {
        const handle = ref.handle ?? '';
        const parsed = handle.length > 0 ? parseJournalRefHandle(handle) : null;
        return {
          fields: {
            journalId: handle || 'null',
            scope: parsed?.scope ?? 'unknown',
            deviceId: parsed?.deviceId ?? 'unknown',
            status: ref.valid ? 'active' : 'invalid',
          },
        };
      }
      if (ref.kind === 'ReporterRef') {
        const handle = ref.handle ?? '';
        const journalHandle =
          handle.length > 0 ? parseReporterRefJournalHandle(handle) : null;
        const parsed =
          journalHandle !== null ? parseJournalRefHandle(journalHandle) : null;
        return {
          fields: {
            reporterId: handle || 'null',
            journalId: journalHandle ?? 'unknown',
            scope: parsed?.scope ?? 'unknown',
            deviceId: parsed?.deviceId ?? 'unknown',
            status: ref.valid ? 'active' : 'invalid',
          },
        };
      }
      return null;
    },
    printLine: (line) => {
      console.log(`[device-board] ${line}`);
    },
    enumerateMicrophones: () => bridge.enumerateMicrophones(),
    selectMicrophone: () => bridge.selectMicrophone(),
    startStream: () => bridge.startStream(),
    stopStream: () => bridge.stopStream(),
    startAudioStreaming: (microphone) => bridge.startAudioStreaming(microphone),
    stopAudioStreaming: (microphone) => bridge.stopAudioStreaming(microphone),
    getActiveAudioStreamRef: () => bridge.getActiveAudioStreamRef(),
    captureAudioSample: (nodeId, streamRef) => bridge.captureAudioSample(nodeId, streamRef),
    getCapturedAudioSampleRef: (nodeId) => bridge.getCapturedAudioSampleRef(nodeId),
    computeFftFrame: (nodeId, sampleRef) => bridge.computeFftFrame(nodeId, sampleRef),
    getCapturedFftFrameRef: (nodeId) => bridge.getCapturedFftFrameRef(nodeId),
    getRecorderSessionRef: (deviceHandle) => bridge.getRecorderSessionRef(deviceHandle),
    getSpectralAnalyserSessionRef: (deviceHandle) =>
      bridge.getSpectralAnalyserSessionRef(deviceHandle),
    appendRecorderSample: (deviceHandle, sampleRef) =>
      bridge.appendRecorderSample(deviceHandle, sampleRef),
    appendSpectralAnalyserFrame: (deviceHandle, frameRef) =>
      bridge.appendSpectralAnalyserFrame(deviceHandle, frameRef),
    flushRecorderSession: (deviceHandle) => bridge.flushRecorderSession(deviceHandle),
    flushSpectralAnalyserSession: (deviceHandle) =>
      bridge.flushSpectralAnalyserSession(deviceHandle),
    subscribeRecorderCollect: (deviceHandle, collectNodeId) =>
      bridge.subscribeRecorderCollect(deviceHandle, collectNodeId),
    subscribeSpectralAnalyserCollect: (deviceHandle, collectNodeId) =>
      bridge.subscribeSpectralAnalyserCollect(deviceHandle, collectNodeId),
    resetCollectorSessions: () => bridge.resetCollectorSessions(),
    getDeviceJournalRef: (deviceHandle) =>
      createReferenceValue('JournalRef', formatJournalRefHandle('device', deviceHandle)),
    getServerJournalRef: (deviceHandle) =>
      createReferenceValue('JournalRef', formatJournalRefHandle('server', deviceHandle)),
    getReporterRef: (journalHandle) =>
      createReferenceValue('ReporterRef', formatReporterRefHandle(journalHandle)),
    createTrackFromSampleRefs: (nodeId, refs) =>
      bridge.createTrackFromSampleRefs(nodeId, refs),
    analyzeFftTrendsFromFrameRefs: (nodeId, refs) =>
      bridge.analyzeFftTrendsFromFrameRefs(nodeId, refs),
    writeJournal: (event) => bridge.writeJournal(event),
    recordChunk: (options) => bridge.recordChunk(options),
    trendsFftDetect: () => bridge.trendsFftDetect(),
    evaluateSoundLevel: () => bridge.evaluateSoundLevel(),
    waitUntilNextLoopTick: ({ pauseMs, signal }) => waitMs(pauseMs, signal),
    watchConnection: (handlers) => bridge.watchConnection(handlers),
    setInfoLoggingEnabled: setScenarioRuntimeInfoLogging,
    log: (message, context) => {
      scenarioRuntimeInfo(`[device-board] ${message}`, context);
    },
  };
}
