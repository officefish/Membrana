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
      return null;
    },
    printLine: (line) => {
      console.log(`[device-board] ${line}`);
    },
    enumerateMicrophones: () => bridge.enumerateMicrophones(),
    selectMicrophone: () => bridge.selectMicrophone(),
    startStream: () => bridge.startStream(),
    stopStream: () => bridge.stopStream(),
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
