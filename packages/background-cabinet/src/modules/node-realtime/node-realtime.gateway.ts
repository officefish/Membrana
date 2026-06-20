import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { IncomingMessage } from 'node:http';
import type { Server, WebSocket } from 'ws';
import { parseNodeRealtimeEnvelope, type NodeRealtimeEnvelope } from '../../domain/node-realtime-wire';
import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { NodeRealtimeAuthService } from './node-realtime-auth.service';
import { NodeRealtimeJournalHandler } from './node-realtime-journal.handler';
import { NodeRealtimeService } from './node-realtime.service';
import type { NodeRealtimeSocketMeta } from './node-realtime.service';

const WS_PATH = '/v1/nodes/realtime';

interface TrackedClient extends WebSocket {
  membranaMeta?: NodeRealtimeSocketMeta;
}

function parseHandshakeUrl(request: IncomingMessage): URL {
  const host = request.headers.host ?? 'localhost';
  return new URL(request.url ?? WS_PATH, `http://${host}`);
}

@WebSocketGateway({ path: WS_PATH })
@Injectable()
export class NodeRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(NodeRealtimeGateway.name);

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly authService: NodeRealtimeAuthService,
    private readonly realtimeService: NodeRealtimeService,
    private readonly journalHandler: NodeRealtimeJournalHandler,
  ) {
    this.heartbeatTimer = setInterval(() => this.pingClients(), 30_000);
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async handleConnection(client: TrackedClient, request: IncomingMessage): Promise<void> {
    if (!this.config.NODE_REALTIME_ENABLED) {
      client.close(4503, 'Realtime gateway disabled');
      return;
    }

    try {
      const url = parseHandshakeUrl(request);
      const role = url.searchParams.get('role');
      const token = url.searchParams.get('token') ?? '';
      const deviceId = url.searchParams.get('deviceId') ?? '';
      const membraneId = url.searchParams.get('membraneId') ?? undefined;

      let meta: NodeRealtimeSocketMeta;
      if (role === 'cabinet') {
        meta = await this.authService.authenticateCabinet(token, membraneId);
        this.realtimeService.registerCabinet(meta, client);
      } else if (role === 'node') {
        meta = await this.authService.authenticateNode(token, deviceId);
        this.realtimeService.registerNode(meta, client);
      } else {
        client.close(4400, 'Missing or invalid role');
        return;
      }

      client.membranaMeta = meta;
      client.on('message', (data) => {
        void this.handleMessage(client, data);
      });
    } catch (err) {
      this.logger.warn({ err }, 'websocket connection rejected');
      client.close(4401, 'Unauthorized');
    }
  }

  handleDisconnect(client: TrackedClient): void {
    this.realtimeService.unregister(client);
    client.membranaMeta = undefined;
  }

  private async handleMessage(client: TrackedClient, data: unknown): Promise<void> {
    const meta = client.membranaMeta;
    if (!meta) return;

    try {
      const text = typeof data === 'string' ? data : Buffer.isBuffer(data) ? data.toString('utf8') : '';
      if (!text) return;

      const raw: unknown = JSON.parse(text);
      const parsed = parseNodeRealtimeEnvelope(raw);
      if (!parsed.ok) {
        this.logger.debug({ error: parsed.error }, 'invalid realtime envelope');
        return;
      }

      await this.dispatchEnvelope(meta, parsed.value);
    } catch (err) {
      this.logger.warn({ err }, 'websocket message handling failed');
    }
  }

  /** Маршрутизация распарсенного envelope по роли и каналу. Публичный для unit-тестов. */
  async dispatchEnvelope(
    meta: NodeRealtimeSocketMeta,
    envelope: NodeRealtimeEnvelope,
  ): Promise<void> {
    if (meta.role === 'node') {
      // MP7b: runtime state/log из узла транслируем подписчикам кабинета напрямую.
      if (envelope.channel === 'runtime') {
        this.realtimeService.fanOutToCabinet(meta.membraneId, envelope);
        return;
      }
      await this.journalHandler.handleIncoming(meta, envelope);
      return;
    }

    // MP7b: команды runtime (run/stop/setMode) и mic-live идут из кабинета на узел.
    if (
      meta.role === 'cabinet' &&
      (envelope.channel === 'mic-live' || envelope.channel === 'runtime')
    ) {
      // RT5 multi-node: команда может адресовать конкретный узел через payload.deviceId;
      // иначе берём узел, привязанный к подключению кабинета.
      const targetDeviceId =
        (envelope.channel === 'runtime'
          ? (envelope.payload as { deviceId?: unknown } | null)?.deviceId
          : undefined);
      const deviceId =
        typeof targetDeviceId === 'string' && targetDeviceId.length > 0
          ? targetDeviceId
          : meta.mediaDeviceId;
      if (deviceId) {
        this.realtimeService.sendToNode(deviceId, envelope);
      }
    }
  }

  private pingClients(): void {
    for (const client of this.server.clients) {
      const ws = client as WebSocket;
      if (ws.readyState === ws.OPEN) {
        ws.ping();
      }
    }
  }
}
