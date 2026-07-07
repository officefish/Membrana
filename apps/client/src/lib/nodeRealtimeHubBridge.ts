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
let authFailedUnsub: (() => void) | null = null;
let authFailDebounce: ReturnType<typeof setTimeout> | null = null;

/** PCB2: дебаунс auth-fail — не дёргаем при кратких HMR/сетевых разрывах. */
const AUTH_FAIL_DEBOUNCE_MS = 2500;

function clearAuthFailWiring(): void {
  authFailedUnsub?.();
  authFailedUnsub = null;
  if (authFailDebounce !== null) {
    clearTimeout(authFailDebounce);
    authFailDebounce = null;
  }
}

/** Connect / disconnect Node Realtime Gateway with pairing lifecycle. */
export function reconfigureNodeRealtimeFromConnection(
  mode?: NodeConnectionMode | null,
  pairing?: PairedNodeCredentials | null,
): void {
  sessionInvalidatedUnsub?.();
  sessionInvalidatedUnsub = null;
  clearAuthFailWiring();

  const client = getNodeRealtimeClient();
  if (mode === 'paired' && pairing) {
    client.connectNode(pairing);
    startBoardLeaseBridge();
    startRuntimeRealtimeBridge();
    sessionInvalidatedUnsub = client.onSessionInvalidated((reason) => {
      useNodeConnectionStore.getState().handlePairingInvalid(reason);
    });
    // PCB2: WS 4401 (сессия отвергнута) → немедленно, но с дебаунсом; если за
    // это время не переподключились — считаем сопряжение недействительным
    // (тот же диалог, что и sessionInvalidated), не ждём 60с поллинга.
    authFailedUnsub = client.onAuthFailed(() => {
      if (authFailDebounce !== null) return;
      authFailDebounce = setTimeout(() => {
        authFailDebounce = null;
        if (client.getState() !== 'connected') {
          useNodeConnectionStore.getState().handlePairingInvalid('session_expired');
        }
      }, AUTH_FAIL_DEBOUNCE_MS);
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
  clearAuthFailWiring();
  stopRuntimeRealtimeBridge();
  stopBoardLeaseBridge();
  getNodeRealtimeClient().disconnect();
}
