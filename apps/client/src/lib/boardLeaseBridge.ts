import {
  NODE_REALTIME_EVENT_TYPES,
  parseBoardCaptureStatePayload,
  parseBoardEditLeasePayload,
  type NodeRealtimeEnvelope,
} from '@membrana/core';

import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import { useServerFirstStore } from '@/stores/serverFirstStore';

let messageUnsub: (() => void) | null = null;

function isBoardEnvelope(envelope: NodeRealtimeEnvelope): boolean {
  return envelope.channel === 'board';
}

function applyBoardEnvelope(envelope: NodeRealtimeEnvelope, localDeviceId: string | null): void {
  if (localDeviceId === null) {
    return;
  }

  const store = useServerFirstStore.getState();

  if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.editLease) {
    const payload = parseBoardEditLeasePayload(envelope.payload);
    if (payload === null || payload.deviceId !== localDeviceId) {
      return;
    }
    if (payload.holder === 'none') {
      store.setEditLease(null);
      return;
    }
    store.setEditLease(payload);
    return;
  }

  if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.captureState) {
    const payload = parseBoardCaptureStatePayload(envelope.payload);
    if (payload === null || payload.deviceId !== localDeviceId) {
      return;
    }
    store.setCaptureState(payload);
  }
}

/** SF4: подписка на board.edit-lease и board.capture-state для полевого узла. */
export function startBoardLeaseBridge(): void {
  if (messageUnsub !== null) {
    return;
  }
  const client = getNodeRealtimeClient();
  messageUnsub = client.subscribeMessages((envelope) => {
    if (!isBoardEnvelope(envelope)) {
      return;
    }
    applyBoardEnvelope(envelope, client.getDeviceId());
  });
}

export function stopBoardLeaseBridge(): void {
  messageUnsub?.();
  messageUnsub = null;
  useServerFirstStore.getState().reset();
}

export function resetBoardLeaseBridgeForTests(): void {
  stopBoardLeaseBridge();
}

/** @internal unit tests */
export function applyBoardEnvelopeForTests(
  envelope: NodeRealtimeEnvelope,
  localDeviceId: string | null,
): void {
  applyBoardEnvelope(envelope, localDeviceId);
}
