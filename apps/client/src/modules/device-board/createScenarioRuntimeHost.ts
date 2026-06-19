import type { ScenarioReferenceValue } from '@membrana/core';
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
