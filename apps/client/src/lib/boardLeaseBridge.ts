import {
  NODE_REALTIME_EVENT_TYPES,
  parseBoardCaptureHeartbeatPayload,
  parseBoardCapturePayload,
  parseBoardCaptureReleasePayload,
  parseBoardCaptureStatePayload,
  parseBoardEditLeasePayload,
  type NodeRealtimeEnvelope,
} from '@membrana/core';

import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';
import { useServerFirstStore } from '@/stores/serverFirstStore';

let messageUnsub: (() => void) | null = null;
let captureTtlTimer: ReturnType<typeof setTimeout> | null = null;

function clearCaptureTtlTimer(): void {
  if (captureTtlTimer !== null) {
    clearTimeout(captureTtlTimer);
    captureTtlTimer = null;
  }
}

/**
 * TTL auto-release (канон §3): 5 мин без heartbeat — включая разрыв WS —
 * и клиент самостоятельно возвращается в автономию. Восстановление
 * соединения до дедлайна переармирует таймер очередным heartbeat.
 */
function armCaptureTtl(expiresAt: string): void {
  clearCaptureTtlTimer();
  const delay = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(delay) || delay <= 0) {
    useServerFirstStore.getState().releaseCapture('ttl-expired');
    return;
  }
  captureTtlTimer = setTimeout(() => {
    captureTtlTimer = null;
    useServerFirstStore.getState().releaseCapture('ttl-expired');
  }, delay);
}

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
    return;
  }

  // --- Явный захват v2 (CT4, канон §3) ---

  if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.capture) {
    const payload = parseBoardCapturePayload(envelope.payload);
    if (payload === null || payload.deviceId !== localDeviceId) {
      return;
    }
    store.setCapture({
      mode: payload.mode,
      sessionId: payload.sessionId,
      expiresAt: payload.expiresAt,
    });
    armCaptureTtl(payload.expiresAt);
    return;
  }

  if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.heartbeat) {
    const payload = parseBoardCaptureHeartbeatPayload(envelope.payload);
    if (payload === null || payload.deviceId !== localDeviceId) {
      return;
    }
    const current = useServerFirstStore.getState().capture;
    if (current === null || current.sessionId !== payload.sessionId) {
      return;
    }
    store.applyCaptureHeartbeat(payload.sessionId, payload.expiresAt);
    armCaptureTtl(payload.expiresAt);
    return;
  }

  if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.release) {
    const payload = parseBoardCaptureReleasePayload(envelope.payload);
    if (payload === null || payload.deviceId !== localDeviceId) {
      return;
    }
    clearCaptureTtlTimer();
    // Release НЕ останавливает играющий сценарий (канон §3) — только состояние.
    store.releaseCapture(payload.reason);
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
  clearCaptureTtlTimer();
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
