import type { NodeConnectionMode, PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
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
    sessionInvalidatedUnsub = client.onSessionInvalidated((reason) => {
      useNodeConnectionStore.getState().handlePairingInvalid(reason);
    });
    return;
  }

  client.disconnect();
}

export function resetNodeRealtimeHubBridgeForTests(): void {
  sessionInvalidatedUnsub?.();
  sessionInvalidatedUnsub = null;
  getNodeRealtimeClient().disconnect();
}
