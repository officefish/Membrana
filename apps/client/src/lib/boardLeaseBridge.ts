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
import { notifyStudioCaptureAcquired } from '@/lib/electronStudioShellPort';
import { writeElectronShellLog } from '@/lib/electronShellLogPort';
import { useServerFirstStore } from '@/stores/serverFirstStore';

let messageUnsub: (() => void) | null = null;
let connectionUnsub: (() => void) | null = null;
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
    writeElectronShellLog('info', '[capture] release reason=ttl-expired (expired on arm)');
    return;
  }
  captureTtlTimer = setTimeout(() => {
    captureTtlTimer = null;
    useServerFirstStore.getState().releaseCapture('ttl-expired');
    // SC4: capture-lifecycle в M1 shell-лог студии (no-op в браузере) — logs:parse:shell.
    writeElectronShellLog('info', '[capture] release reason=ttl-expired (local TTL)');
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
    const previous = useServerFirstStore.getState().capture;
    store.setCapture({
      mode: payload.mode,
      sessionId: payload.sessionId,
      expiresAt: payload.expiresAt,
    });
    armCaptureTtl(payload.expiresAt);
    // SC4: capture-lifecycle в M1 shell-лог студии (no-op в браузере).
    writeElectronShellLog(
      'info',
      `[capture] acquired mode=${payload.mode} session=${payload.sessionId}`,
    );
    // SC1: Studio-shell поднимает окно один раз на acquire (не на смену режима
    // той же сессии) — оператору нужен alert и доступ к emergency stop (§3.3).
    if (previous === null || previous.sessionId !== payload.sessionId) {
      notifyStudioCaptureAcquired();
    }
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
    writeElectronShellLog('debug', `[capture] heartbeat session=${payload.sessionId}`);
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
    writeElectronShellLog('info', `[capture] release reason=${payload.reason}`);
  }
}

/** SF4 + CT5: подписка на board-события и connection state для полевого узла. */
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
  // CT5 (канон §7): при разрыве WS под захватом показываем «Соединение потеряно»;
  // сам захват отпустит TTL-таймер (канон §3), не разрыв.
  connectionUnsub = client.subscribeState((connectionState) => {
    useServerFirstStore.getState().setRealtimeConnected(connectionState === 'connected');
  });
}

export function stopBoardLeaseBridge(): void {
  messageUnsub?.();
  messageUnsub = null;
  connectionUnsub?.();
  connectionUnsub = null;
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
