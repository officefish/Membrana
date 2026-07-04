import {
  NODE_REALTIME_EVENT_TYPES,
  parseBoardCaptureHeartbeatPayload,
  parseBoardCapturePayload,
  parseBoardCaptureReleasePayload,
  parseNodeRealtimeEnvelope,
  parsePresenceSnapshotPayload,
  type AnalysisBriefPayload,
  type BoardCaptureHeartbeatPayload,
  type BoardCapturePayload,
  type BoardCaptureReleasePayload,
  type JournalAppendPayload,
  type NodeOnlinePayload,
  type NodeRealtimeEnvelope,
  type PresenceSnapshotPayload,
  type RuntimeStatePayload,
} from '@membrana/core';

import { getStoredToken } from '@/api/auth';
import { getCabinetRealtimeWsUrl } from '@/lib/nodeRealtimeUrl';

export type CabinetRealtimeClientState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

type StateHandler = (state: CabinetRealtimeClientState) => void;
type JournalAppendHandler = (envelope: NodeRealtimeEnvelope<JournalAppendPayload>) => void;
type MicBriefHandler = (payload: AnalysisBriefPayload) => void;
type RuntimeStateHandler = (payload: RuntimeStatePayload) => void;
type PresenceSnapshotHandler = (payload: PresenceSnapshotPayload) => void;
type PresenceOnlineHandler = (payload: NodeOnlinePayload) => void;
type PresenceOfflineHandler = (payload: NodeOnlinePayload) => void;
type BoardCaptureHandler = (payload: BoardCapturePayload) => void;
type BoardCaptureHeartbeatHandler = (payload: BoardCaptureHeartbeatPayload) => void;
type BoardCaptureReleaseHandler = (payload: BoardCaptureReleasePayload) => void;

const MAX_BACKOFF_MS = 30_000;

/**
 * PCB1 (presence-capture-board): логи WS-жизненного цикла КАБИНЕТА в консоли.
 * Диагностика persistent-offline со стороны кабинета: подключён ли WS кабинета,
 * приходит ли presence-снапшот и есть ли в нём deviceId узла, ловятся ли online.
 */
function logCabinetWs(event: string, detail: Record<string, unknown>): void {
  // eslint-disable-next-line no-console
  console.info(`[cabinet-ws] ${event}`, detail);
}

class CabinetNodeRealtimeClientImpl {
  private socket: WebSocket | null = null;

  private membraneId: string | null = null;

  private state: CabinetRealtimeClientState = 'disconnected';

  private reconnectAttempt = 0;

  private reconnectTimer: number | null = null;

  private readonly stateHandlers = new Set<StateHandler>();

  private readonly journalHandlers = new Set<JournalAppendHandler>();

  private readonly micBriefHandlers = new Set<MicBriefHandler>();

  private readonly runtimeStateHandlers = new Set<RuntimeStateHandler>();

  private readonly presenceSnapshotHandlers = new Set<PresenceSnapshotHandler>();

  private readonly presenceOnlineHandlers = new Set<PresenceOnlineHandler>();

  private readonly presenceOfflineHandlers = new Set<PresenceOfflineHandler>();

  private readonly boardCaptureHandlers = new Set<BoardCaptureHandler>();

  private readonly boardCaptureHeartbeatHandlers = new Set<BoardCaptureHeartbeatHandler>();

  private readonly boardCaptureReleaseHandlers = new Set<BoardCaptureReleaseHandler>();

  getState(): CabinetRealtimeClientState {
    return this.state;
  }

  /** Отправить envelope узлу (cabinet → server → node). MP7b RT5. */
  send(envelope: NodeRealtimeEnvelope): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
    this.socket.send(JSON.stringify(envelope));
  }

  subscribeRuntimeState(handler: RuntimeStateHandler): () => void {
    this.runtimeStateHandlers.add(handler);
    return () => this.runtimeStateHandlers.delete(handler);
  }

  subscribeState(handler: StateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => this.stateHandlers.delete(handler);
  }

  subscribeJournalAppend(handler: JournalAppendHandler): () => void {
    this.journalHandlers.add(handler);
    return () => this.journalHandlers.delete(handler);
  }

  subscribeMicBrief(handler: MicBriefHandler): () => void {
    this.micBriefHandlers.add(handler);
    return () => this.micBriefHandlers.delete(handler);
  }

  /** PL1: bootstrap-снапшот присутствия при подключении кабинета. */
  subscribePresenceSnapshot(handler: PresenceSnapshotHandler): () => void {
    this.presenceSnapshotHandlers.add(handler);
    return () => this.presenceSnapshotHandlers.delete(handler);
  }

  subscribePresenceOnline(handler: PresenceOnlineHandler): () => void {
    this.presenceOnlineHandlers.add(handler);
    return () => this.presenceOnlineHandlers.delete(handler);
  }

  subscribePresenceOffline(handler: PresenceOfflineHandler): () => void {
    this.presenceOfflineHandlers.add(handler);
    return () => this.presenceOfflineHandlers.delete(handler);
  }

  /** CT3 (tariff v2): состояние явного захвата устройств (board.capture). */
  subscribeBoardCapture(handler: BoardCaptureHandler): () => void {
    this.boardCaptureHandlers.add(handler);
    return () => this.boardCaptureHandlers.delete(handler);
  }

  subscribeBoardCaptureHeartbeat(handler: BoardCaptureHeartbeatHandler): () => void {
    this.boardCaptureHeartbeatHandlers.add(handler);
    return () => this.boardCaptureHeartbeatHandlers.delete(handler);
  }

  subscribeBoardCaptureRelease(handler: BoardCaptureReleaseHandler): () => void {
    this.boardCaptureReleaseHandlers.add(handler);
    return () => this.boardCaptureReleaseHandlers.delete(handler);
  }

  connect(membraneId: string): void {
    this.membraneId = membraneId;
    this.openSocket();
  }

  disconnect(): void {
    this.membraneId = null;
    this.clearReconnectTimer();
    this.socket?.close();
    this.socket = null;
    this.setState('disconnected');
  }

  private setState(next: CabinetRealtimeClientState): void {
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
    if (!this.membraneId) return;
    this.clearReconnectTimer();
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
    this.reconnectAttempt += 1;
    this.setState('reconnecting');
    this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay);
  }

  private openSocket(): void {
    const token = getStoredToken();
    if (!this.membraneId || !token || typeof WebSocket === 'undefined') return;

    this.clearReconnectTimer();
    this.socket?.close();

    const url = new URL(getCabinetRealtimeWsUrl());
    url.searchParams.set('role', 'cabinet');
    url.searchParams.set('token', token);
    url.searchParams.set('membraneId', this.membraneId);

    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');
    logCabinetWs('connecting', {
      membraneId: this.membraneId,
      attempt: this.reconnectAttempt,
      url: `${url.origin}${url.pathname}`,
    });
    const ws = new WebSocket(url.toString());
    this.socket = ws;

    ws.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.setState('connected');
      logCabinetWs('open', { membraneId: this.membraneId });
    });

    ws.addEventListener('message', (event) => {
      try {
        const parsed = parseNodeRealtimeEnvelope(JSON.parse(String(event.data)));
        if (!parsed.ok) return;
        const envelope = parsed.value;
        if (
          envelope.channel === 'journal' &&
          envelope.type === NODE_REALTIME_EVENT_TYPES.journal.append
        ) {
          for (const handler of this.journalHandlers) {
            handler(envelope as NodeRealtimeEnvelope<JournalAppendPayload>);
          }
        }
        if (
          envelope.channel === 'mic-live' &&
          envelope.type === NODE_REALTIME_EVENT_TYPES.micLive.analysisBrief
        ) {
          const payload = envelope.payload as AnalysisBriefPayload;
          for (const handler of this.micBriefHandlers) {
            handler(payload);
          }
        }
        if (
          envelope.channel === 'runtime' &&
          envelope.type === NODE_REALTIME_EVENT_TYPES.runtime.state
        ) {
          const payload = envelope.payload as RuntimeStatePayload;
          for (const handler of this.runtimeStateHandlers) {
            handler(payload);
          }
        }
        if (
          envelope.channel === 'presence' &&
          envelope.type === NODE_REALTIME_EVENT_TYPES.presence.snapshot
        ) {
          const payload = parsePresenceSnapshotPayload(envelope.payload);
          // PCB1: пришёл ли снапшот и есть ли в нём онлайн-узлы? Пустой снапшот
          // при подключённом узле = проблема на сервере (registerNode/membraneId).
          logCabinetWs('presence.snapshot', {
            onlineDeviceIds: payload?.onlineDeviceIds ?? null,
            count: payload?.onlineDeviceIds.length ?? 0,
          });
          if (payload !== null) {
            for (const handler of this.presenceSnapshotHandlers) {
              handler(payload);
            }
          }
        }
        if (
          envelope.channel === 'presence' &&
          envelope.type === NODE_REALTIME_EVENT_TYPES.presence.nodeOnline
        ) {
          const payload = envelope.payload as NodeOnlinePayload;
          logCabinetWs('presence.nodeOnline', { deviceId: payload.deviceId });
          for (const handler of this.presenceOnlineHandlers) {
            handler(payload);
          }
        }
        if (
          envelope.channel === 'presence' &&
          envelope.type === NODE_REALTIME_EVENT_TYPES.presence.nodeOffline
        ) {
          const payload = envelope.payload as NodeOnlinePayload;
          logCabinetWs('presence.nodeOffline', { deviceId: payload.deviceId });
          for (const handler of this.presenceOfflineHandlers) {
            handler(payload);
          }
        }
        // CT3 (tariff v2): board.capture/heartbeat/release — server-originated broadcast.
        if (envelope.channel === 'board') {
          if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.capture) {
            const payload = parseBoardCapturePayload(envelope.payload);
            if (payload !== null) {
              for (const handler of this.boardCaptureHandlers) {
                handler(payload);
              }
            }
          }
          if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.heartbeat) {
            const payload = parseBoardCaptureHeartbeatPayload(envelope.payload);
            if (payload !== null) {
              for (const handler of this.boardCaptureHeartbeatHandlers) {
                handler(payload);
              }
            }
          }
          if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.release) {
            const payload = parseBoardCaptureReleasePayload(envelope.payload);
            if (payload !== null) {
              for (const handler of this.boardCaptureReleaseHandlers) {
                handler(payload);
              }
            }
          }
        }
      } catch {
        /* ignore malformed frames */
      }
    });

    ws.addEventListener('close', (event) => {
      logCabinetWs('close', { code: event.code, reason: event.reason || undefined });
      if (this.membraneId) {
        this.scheduleReconnect();
      } else {
        this.setState('disconnected');
      }
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }
}

const client = new CabinetNodeRealtimeClientImpl();

export function getCabinetNodeRealtimeClient(): CabinetNodeRealtimeClientImpl {
  return client;
}

export function resetCabinetNodeRealtimeClientForTests(): void {
  client.disconnect();
}
