import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import {
  startBoardLeaseBridge,
  stopBoardLeaseBridge,
} from '@/lib/boardLeaseBridge';
import {
  startRuntimeRealtimeBridge,
  stopRuntimeRealtimeBridge,
} from '@/lib/runtimeRealtimeBridge';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';

let sessionInvalidatedUnsub: (() => void) | null = null;

/** Connect / disconnect Node Realtime Gateway with pairing lifecycle. */
export function reconfigureNodeRealtimeFromConnection(
  mode?: NodeConnectionMode | null,
  pairing?: PairedNodeCredentials | null,
): void {
  sessionInvalidatedUnsub?.();
  sessionInvalidatedUnsub = null;

  const client = getNodeRealtimeClient();
  if (mode === 'paired' && pairing) {
    client.connectNode(pairing);
    startBoardLeaseBridge();
    startRuntimeRealtimeBridge();
    sessionInvalidatedUnsub = client.onSessionInvalidated((reason) => {
      useNodeConnectionStore.getState().handlePairingInvalid(reason);
    });
    return;
  }

  stopRuntimeRealtimeBridge();
  stopBoardLeaseBridge();
  client.disconnect();
}

export function resetNodeRealtimeHubBridgeForTests(): void {
  sessionInvalidatedUnsub?.();
  sessionInvalidatedUnsub = null;
  stopRuntimeRealtimeBridge();
  stopBoardLeaseBridge();
  getNodeRealtimeClient().disconnect();
}
