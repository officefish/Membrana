import {
  NODE_REALTIME_EVENT_TYPES,
  parseNodeRealtimeEnvelope,
  type AnalysisBriefPayload,
  type JournalAppendPayload,
  type NodeOnlinePayload,
  type NodeRealtimeEnvelope,
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
type PresenceOnlineHandler = (payload: NodeOnlinePayload) => void;
type PresenceOfflineHandler = (payload: NodeOnlinePayload) => void;

const MAX_BACKOFF_MS = 30_000;

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

  private readonly presenceOnlineHandlers = new Set<PresenceOnlineHandler>();

  private readonly presenceOfflineHandlers = new Set<PresenceOfflineHandler>();

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

  subscribePresenceOnline(handler: PresenceOnlineHandler): () => void {
    this.presenceOnlineHandlers.add(handler);
    return () => this.presenceOnlineHandlers.delete(handler);
  }

  subscribePresenceOffline(handler: PresenceOfflineHandler): () => void {
    this.presenceOfflineHandlers.add(handler);
    return () => this.presenceOfflineHandlers.delete(handler);
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
    const ws = new WebSocket(url.toString());
    this.socket = ws;

    ws.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.setState('connected');
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
          envelope.type === NODE_REALTIME_EVENT_TYPES.presence.nodeOnline
        ) {
          const payload = envelope.payload as NodeOnlinePayload;
          for (const handler of this.presenceOnlineHandlers) {
            handler(payload);
          }
        }
        if (
          envelope.channel === 'presence' &&
          envelope.type === NODE_REALTIME_EVENT_TYPES.presence.nodeOffline
        ) {
          const payload = envelope.payload as NodeOnlinePayload;
          for (const handler of this.presenceOfflineHandlers) {
            handler(payload);
          }
        }
      } catch {
        /* ignore malformed frames */
      }
    });

    ws.addEventListener('close', () => {
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
