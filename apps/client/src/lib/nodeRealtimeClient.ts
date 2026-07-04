import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  parseNodeRealtimeEnvelope,
  type NodeRealtimeEnvelope,
  type SessionInvalidatedPayload,
} from '@membrana/core';

import { getClientRuntimeVersion } from '@/lib/electronStudioShellPort';
import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';
import { getCabinetRealtimeWsUrl } from '@/lib/nodeRealtimeUrl';

export type NodeRealtimeClientState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

type MessageHandler = (envelope: NodeRealtimeEnvelope) => void;
type StateHandler = (state: NodeRealtimeClientState) => void;

const MAX_BACKOFF_MS = 30_000;

/**
 * PCB1 (presence-capture-board): единая точка логов WS-жизненного цикла узла.
 * Видно в консоли браузера (dev-песочница) — диагностика persistent-offline:
 * связка connecting → open (registered) → close(code). code=4401 = auth-fail (H1).
 */
function logNodeWs(event: string, detail: Record<string, unknown>): void {
  const level = detail.authFail || detail.code === 4401 ? 'warn' : 'info';
  // eslint-disable-next-line no-console
  console[level](`[node-ws] ${event}`, detail);
}

class NodeRealtimeClientImpl {
  private socket: WebSocket | null = null;

  private pairing: PairedNodeCredentials | null = null;

  private state: NodeRealtimeClientState = 'disconnected';

  private reconnectAttempt = 0;

  private reconnectTimer: number | null = null;

  private readonly messageHandlers = new Set<MessageHandler>();

  private readonly stateHandlers = new Set<StateHandler>();

  getState(): NodeRealtimeClientState {
    return this.state;
  }

  getDeviceId(): string | null {
    return this.pairing?.deviceId ?? null;
  }

  subscribeMessages(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  subscribeState(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  connectNode(pairing: PairedNodeCredentials): void {
    this.pairing = pairing;
    this.openSocket();
  }

  disconnect(): void {
    this.pairing = null;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
    this.setState('disconnected');
  }

  send(envelope: NodeRealtimeEnvelope): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(envelope));
  }

  private setState(next: NodeRealtimeClientState): void {
    if (this.state === next) return;
    this.state = next;
    for (const handler of this.stateHandlers) {
      handler(next);
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (!this.pairing) return;
    this.clearReconnectTimer();
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
    this.reconnectAttempt += 1;
    this.setState('reconnecting');
    logNodeWs('reconnect-scheduled', { attempt: this.reconnectAttempt, delayMs: delay });
    this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay);
  }

  private openSocket(): void {
    if (!this.pairing || typeof WebSocket === 'undefined') return;

    this.clearReconnectTimer();
    this.socket?.close();

    const url = new URL(getCabinetRealtimeWsUrl());
    url.searchParams.set('role', 'node');
    url.searchParams.set('token', this.pairing.token);
    url.searchParams.set('deviceId', this.pairing.deviceId);
    // SC5: маркер сборки (studio-<semver> | web) — cabinet логирует устаревшие
    // сборки warning-ом (тихая деградация принята консилиумом; strict gate — DR6).
    url.searchParams.set('clientVersion', getClientRuntimeVersion());

    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    // PCB1 (presence-capture-board): диагностика persistent-offline в браузерной
    // консоли (песочница 1573). Токен не логируем.
    logNodeWs('connecting', {
      deviceId: this.pairing.deviceId,
      attempt: this.reconnectAttempt,
      url: `${url.origin}${url.pathname}`,
    });
    const ws = new WebSocket(url.toString());
    this.socket = ws;

    ws.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.setState('connected');
      logNodeWs('open', { deviceId: this.pairing?.deviceId });
    });

    ws.addEventListener('message', (event) => {
      try {
        const parsed = parseNodeRealtimeEnvelope(JSON.parse(String(event.data)));
        if (!parsed.ok) return;
        if (
          parsed.value.channel === 'presence' &&
          parsed.value.type === NODE_REALTIME_EVENT_TYPES.presence.sessionInvalidated
        ) {
          const payload = parsed.value.payload as SessionInvalidatedPayload;
          this.emitSessionInvalidated(payload.reason);
        }
        for (const handler of this.messageHandlers) {
          handler(parsed.value);
        }
      } catch {
        /* ignore malformed frames */
      }
    });

    ws.addEventListener('close', (event) => {
      // PCB1: код close — ключевой сигнал. 4401 = auth-fail (H1: сессия истекла →
      // кабинет держит offline, хотя клиент «связан» по localStorage); 1006 = сеть.
      logNodeWs('close', {
        code: event.code,
        reason: event.reason || undefined,
        authFail: event.code === 4401,
        deviceId: this.pairing?.deviceId,
      });
      if (this.pairing) {
        this.scheduleReconnect();
      } else {
        this.setState('disconnected');
      }
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  private sessionInvalidatedHandlers = new Set<(reason: SessionInvalidatedPayload['reason']) => void>();

  onSessionInvalidated(handler: (reason: SessionInvalidatedPayload['reason']) => void): () => void {
    this.sessionInvalidatedHandlers.add(handler);
    return () => this.sessionInvalidatedHandlers.delete(handler);
  }

  private emitSessionInvalidated(reason: SessionInvalidatedPayload['reason']): void {
    for (const handler of this.sessionInvalidatedHandlers) {
      handler(reason);
    }
  }
}

const client = new NodeRealtimeClientImpl();

export function getNodeRealtimeClient(): NodeRealtimeClientImpl {
  return client;
}

export function resetNodeRealtimeClientForTests(): void {
  client.disconnect();
}

export { createNodeRealtimeEnvelope };
