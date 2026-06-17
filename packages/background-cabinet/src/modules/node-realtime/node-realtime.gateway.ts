import {
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
import { parseNodeRealtimeEnvelope } from '../../domain/node-realtime-wire';
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

      if (meta.role === 'node') {
        await this.journalHandler.handleIncoming(meta, parsed.value);
        return;
      }

      if (meta.role === 'cabinet' && parsed.value.channel === 'mic-live') {
        const deviceId = meta.mediaDeviceId;
        if (deviceId) {
          this.realtimeService.sendToNode(deviceId, parsed.value);
        }
      }
    } catch (err) {
      this.logger.warn({ err }, 'websocket message handling failed');
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
