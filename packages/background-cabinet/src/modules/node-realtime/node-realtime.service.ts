import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { WebSocket } from 'ws';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NODE_RECENT_PRESENCE_WINDOW_MS,
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type HealthPingPayload,
  type JournalAckPayload,
  type NodeRealtimeEnvelope,
} from '../../domain/node-realtime-wire';

export interface NodeHealthPingResult {
  readonly reachable: boolean;
  readonly latencyMs: number | null;
}

interface PendingPing {
  readonly resolve: (latencyMs: number) => void;
  readonly sentAt: number;
  readonly timer: ReturnType<typeof setTimeout>;
}

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

  constructor(private readonly prisma: PrismaService) {}

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

  async registerCabinet(meta: NodeRealtimeSocketMeta, socket: WebSocket): Promise<void> {
    let set = this.cabinetSockets.get(meta.membraneId);
    if (!set) {
      set = new Set();
      this.cabinetSockets.set(meta.membraneId, set);
    }
    set.add({ socket, meta });
    // PL1 (pairing-lifecycle): снапшот присутствия сразу этому кабинету —
    // без него узел, связавшийся до открытия кабинета, висел offline
    // (поток nodeOnline транзиентен и доходит только до уже-подключённых).
    await this.sendPresenceSnapshot(meta.membraneId, socket);
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

  private async recentDeviceIdsForMembrane(membraneId: string): Promise<string[]> {
    try {
      const devices = await this.prisma.device.findMany({
        where: {
          node: { membraneId },
          pairingStatus: 'paired',
          lastSeenAt: { gt: new Date(Date.now() - NODE_RECENT_PRESENCE_WINDOW_MS) },
        },
        select: { mediaDeviceId: true },
      });
      return devices.map((device) => device.mediaDeviceId);
    } catch {
      // Presence bootstrap must not reject an otherwise authenticated cabinet socket.
      return [];
    }
  }

  private async sendPresenceSnapshot(membraneId: string, socket: WebSocket): Promise<void> {
    if (socket.readyState !== socket.OPEN) return;
    const liveDeviceIds = this.onlineDeviceIdsForMembrane(membraneId);
    const recentDeviceIds = await this.recentDeviceIdsForMembrane(membraneId);
    if (socket.readyState !== socket.OPEN) return;
    socket.send(
      JSON.stringify({
        v: 1,
        channel: 'presence',
        type: NODE_REALTIME_EVENT_TYPES.presence.snapshot,
        ts: new Date().toISOString(),
        payload: {
          onlineDeviceIds: [...new Set([...liveDeviceIds, ...recentDeviceIds])],
          timestampMs: Date.now(),
        },
      }),
    );
  }

  /** PL2b: серверное время приёма — клиентский timestamp не является источником истины. */
  async recordPresenceHeartbeat(mediaDeviceId: string): Promise<void> {
    await this.prisma.device.updateMany({
      where: { mediaDeviceId },
      data: { lastSeenAt: new Date() },
    });
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

  /**
   * PCB4 (presence-capture-board): «live» = у устройства есть OPEN node-сокет
   * в in-memory реестре. Источник истины presence — тот же, что для fan-out
   * (не БД): нет петли между «кабинет думает online» и реальным сокетом.
   */
  isDeviceLive(mediaDeviceId: string): boolean {
    const tracked = this.nodeSockets.get(mediaDeviceId);
    return tracked !== undefined && tracked.socket.readyState === tracked.socket.OPEN;
  }

  private readonly pendingPings = new Map<string, PendingPing>();

  /**
   * PCB6 (presence-capture-board): активная проба живости узла — echo по WS.
   * Отправляем health.ping с nonce, ждём health.pong (таймаут) → latencyMs.
   * Не «live» (нет OPEN-сокета) → сразу unreachable, без ожидания таймаута.
   */
  async pingNode(mediaDeviceId: string, timeoutMs = 3000): Promise<NodeHealthPingResult> {
    const pingId = randomUUID();
    const sentAt = Date.now();
    const sent = this.sendToNode(
      mediaDeviceId,
      createNodeRealtimeEnvelope('presence', NODE_REALTIME_EVENT_TYPES.presence.healthPing, {
        pingId,
        sentAt,
      } satisfies HealthPingPayload),
    );
    if (!sent) {
      return { reachable: false, latencyMs: null };
    }
    return new Promise<NodeHealthPingResult>((resolve) => {
      const timer = setTimeout(() => {
        this.pendingPings.delete(pingId);
        resolve({ reachable: false, latencyMs: null });
      }, timeoutMs);
      this.pendingPings.set(pingId, {
        resolve: (latencyMs) => resolve({ reachable: true, latencyMs }),
        sentAt,
        timer,
      });
    });
  }

  /** PCB6: узел ответил на пробу — резолвим ожидающий pingNode с latencyMs. */
  handleHealthPong(pingId: string): void {
    const pending = this.pendingPings.get(pingId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pendingPings.delete(pingId);
    pending.resolve(Date.now() - pending.sentAt);
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
