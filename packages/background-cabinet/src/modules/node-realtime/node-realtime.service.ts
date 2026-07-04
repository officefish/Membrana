import { Injectable } from '@nestjs/common';
import type { WebSocket } from 'ws';
import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type JournalAckPayload,
  type NodeRealtimeEnvelope,
} from '../../domain/node-realtime-wire';

export type NodeRealtimeSocketRole = 'node' | 'cabinet';

export interface NodeRealtimeSocketMeta {
  readonly role: NodeRealtimeSocketRole;
  readonly userId: string;
  readonly membraneId: string;
  readonly nodeId: string | null;
  readonly mediaDeviceId: string | null;
}

interface TrackedSocket {
  readonly socket: WebSocket;
  readonly meta: NodeRealtimeSocketMeta;
}

@Injectable()
export class NodeRealtimeService {
  private readonly nodeSockets = new Map<string, TrackedSocket>();

  private readonly cabinetSockets = new Map<string, Set<TrackedSocket>>();

  private readonly journalCursors = new Map<string, string>();

  registerNode(meta: NodeRealtimeSocketMeta, socket: WebSocket): void {
    if (!meta.mediaDeviceId) return;
    this.nodeSockets.set(meta.mediaDeviceId, { socket, meta });
    this.fanOutToCabinet(meta.membraneId, {
      v: 1,
      channel: 'presence',
      type: NODE_REALTIME_EVENT_TYPES.presence.nodeOnline,
      ts: new Date().toISOString(),
      payload: {
        deviceId: meta.mediaDeviceId,
        nodeId: meta.nodeId ?? '',
        membraneId: meta.membraneId,
      },
    });
  }

  registerCabinet(meta: NodeRealtimeSocketMeta, socket: WebSocket): void {
    let set = this.cabinetSockets.get(meta.membraneId);
    if (!set) {
      set = new Set();
      this.cabinetSockets.set(meta.membraneId, set);
    }
    set.add({ socket, meta });
    // PL1 (pairing-lifecycle): снапшот присутствия сразу этому кабинету —
    // без него узел, связавшийся до открытия кабинета, висел offline
    // (поток nodeOnline транзиентен и доходит только до уже-подключённых).
    this.sendPresenceSnapshot(meta.membraneId, socket);
  }

  /** PL1: онлайн-узлы данной membrane из in-memory реестра сокетов. */
  private onlineDeviceIdsForMembrane(membraneId: string): string[] {
    const ids: string[] = [];
    for (const [deviceId, tracked] of this.nodeSockets.entries()) {
      if (tracked.meta.membraneId === membraneId) {
        ids.push(deviceId);
      }
    }
    return ids;
  }

  private sendPresenceSnapshot(membraneId: string, socket: WebSocket): void {
    if (socket.readyState !== socket.OPEN) return;
    socket.send(
      JSON.stringify({
        v: 1,
        channel: 'presence',
        type: NODE_REALTIME_EVENT_TYPES.presence.snapshot,
        ts: new Date().toISOString(),
        payload: {
          onlineDeviceIds: this.onlineDeviceIdsForMembrane(membraneId),
          timestampMs: Date.now(),
        },
      }),
    );
  }

  unregister(socket: WebSocket): void {
    for (const [deviceId, tracked] of this.nodeSockets.entries()) {
      if (tracked.socket === socket) {
        this.nodeSockets.delete(deviceId);
        this.fanOutToCabinet(tracked.meta.membraneId, {
          v: 1,
          channel: 'presence',
          type: NODE_REALTIME_EVENT_TYPES.presence.nodeOffline,
          ts: new Date().toISOString(),
          payload: {
            deviceId,
            nodeId: tracked.meta.nodeId ?? '',
            membraneId: tracked.meta.membraneId,
          },
        });
        return;
      }
    }

    for (const [membraneId, set] of this.cabinetSockets.entries()) {
      for (const tracked of set) {
        if (tracked.socket === socket) {
          set.delete(tracked);
          if (set.size === 0) {
            this.cabinetSockets.delete(membraneId);
          }
          return;
        }
      }
    }
  }

  fanOutToCabinet(membraneId: string, envelope: NodeRealtimeEnvelope): void {
    const set = this.cabinetSockets.get(membraneId);
    if (!set) return;
    const raw = JSON.stringify(envelope);
    for (const tracked of set) {
      if (tracked.socket.readyState === tracked.socket.OPEN) {
        tracked.socket.send(raw);
      }
    }
  }

  sendToNode(mediaDeviceId: string, envelope: NodeRealtimeEnvelope): boolean {
    const tracked = this.nodeSockets.get(mediaDeviceId);
    if (!tracked || tracked.socket.readyState !== tracked.socket.OPEN) {
      return false;
    }
    tracked.socket.send(JSON.stringify(envelope));
    return true;
  }

  /** SF2/SF3: board events — кабинет + полевой узел. */
  broadcastBoardEnvelope(
    membraneId: string,
    mediaDeviceId: string,
    envelope: NodeRealtimeEnvelope,
  ): void {
    this.fanOutToCabinet(membraneId, envelope);
    this.sendToNode(mediaDeviceId, envelope);
  }

  notifySessionInvalidated(
    mediaDeviceId: string,
    membraneId: string,
    reason: 'revoked' | 'expired' | 'session_expired',
  ): void {
    const envelope = createNodeRealtimeEnvelope('presence', NODE_REALTIME_EVENT_TYPES.presence.sessionInvalidated, {
      reason,
    });
    this.sendToNode(mediaDeviceId, envelope);
    this.fanOutToCabinet(membraneId, envelope);
  }

  ackJournalAppend(mediaDeviceId: string, clientEntryId: string): JournalAckPayload {
    const cursor = `${Date.now()}:${clientEntryId}`;
    this.journalCursors.set(mediaDeviceId, cursor);
    const payload: JournalAckPayload = { cursor, clientEntryId };
    this.sendToNode(
      mediaDeviceId,
      createNodeRealtimeEnvelope('journal', NODE_REALTIME_EVENT_TYPES.journal.acked, payload),
    );
    return payload;
  }

  getLastCursor(mediaDeviceId: string): string | null {
    return this.journalCursors.get(mediaDeviceId) ?? null;
  }
}
