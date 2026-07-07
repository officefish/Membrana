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
import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  parseBoardCaptureStatePayload,
  parseBoardEditLeasePayload,
  parseBoardScenarioListPayload,
  parseHealthPongPayload,
  parsePresenceHeartbeatPayload,
  parseNodeRealtimeEnvelope,
  parseRuntimeCommandPayload,
  type NodeRealtimeEnvelope,
} from '../../domain/node-realtime-wire';
import { isCabinetRuntimeCommandAllowed } from '../../domain/device-capture';
import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';
import { DeviceCaptureRegistry } from './device-capture.registry';
import { DeviceScenarioRegistry, type DeviceScenarioEntry } from './device-scenario.registry';
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
    private readonly captureRegistry: DeviceCaptureRegistry,
    private readonly scenarioRegistry: DeviceScenarioRegistry,
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

    // PCB1 (presence-capture-board): deviceId/role в function-scope — нужны в catch
    // для диагностики persistent-offline (различить H1 auth-fail от H3 нет-mediaDeviceId).
    let logRole: string | null = null;
    let logDeviceId = '';
    try {
      const url = parseHandshakeUrl(request);
      const role = url.searchParams.get('role');
      const token = url.searchParams.get('token') ?? '';
      const deviceId = url.searchParams.get('deviceId') ?? '';
      const membraneId = url.searchParams.get('membraneId') ?? undefined;
      logRole = role;
      logDeviceId = deviceId;

      let meta: NodeRealtimeSocketMeta;
      if (role === 'cabinet') {
        meta = await this.authService.authenticateCabinet(token, membraneId);
        await this.realtimeService.registerCabinet(meta, client);
      } else if (role === 'node') {
        // PCB1: три события WS-lifecycle узла (connect → authenticate → register).
        this.logger.log({ deviceId, event: 'node-ws-connect' }, 'node-ws-connect');
        meta = await this.authService.authenticateNode(token, deviceId);
        this.logger.log(
          { deviceId, nodeId: meta.nodeId, event: 'node-ws-authenticate', ok: true },
          'node-ws-authenticate ok',
        );
        this.realtimeService.registerNode(meta, client);
        this.logger.log(
          { deviceId, mediaDeviceId: meta.mediaDeviceId, event: 'node-ws-register' },
          meta.mediaDeviceId
            ? 'node-ws-register ok'
            : 'node-ws-register SKIPPED (no mediaDeviceId — H3)',
        );
        // SC5 (studio-capture-adaptation): маркер сборки клиента. Отсутствие =
        // сборка до tariff v2 — её pause/setMode будут отброшены whitelist-ом
        // (тихая деградация принята консилиумом; strict gate — DR6).
        const clientVersion = url.searchParams.get('clientVersion');
        if (clientVersion) {
          this.logger.log({ deviceId, clientVersion }, 'node client version');
        } else {
          this.logger.warn(
            { deviceId },
            'node client without clientVersion — устаревшая сборка (pre-v2)',
          );
        }
      } else {
        client.close(4400, 'Missing or invalid role');
        return;
      }

      client.membranaMeta = meta;
      client.on('message', (data) => {
        void this.handleMessage(client, data);
      });
    } catch (err) {
      // PCB1: auth-fail узла — вероятная причина persistent-offline (H1): клиент
      // «связан» по credentials, но сессия истекла/отозвана → 4401, registerNode
      // не вызван, кабинету узел не виден. Логируем deviceId + причину.
      if (logRole === 'node') {
        this.logger.error(
          { deviceId: logDeviceId, event: 'node-ws-authenticate', ok: false, reason: String((err as Error)?.message ?? err) },
          'node-ws-authenticate FAIL (H1: сессия истекла/отозвана → узел offline)',
        );
      } else {
        this.logger.warn({ err, role: logRole }, 'websocket connection rejected');
      }
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
      // SF2: board events (lease/capture) от узла — в кабинет.
      if (envelope.channel === 'board') {
        // CX3: объявление списка сценариев — узел авторитетен по составу списка.
        // Сервер нормализует выбор (инвариант «один всегда выбран») и хранит
        // снапшот для bootstrap кабинета (GET /v1/captures).
        if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.scenarioList) {
          const payload = parseBoardScenarioListPayload(envelope.payload);
          if (payload === null) {
            this.logger.debug('invalid board.scenario-list payload');
            return;
          }
          const entry = this.scenarioRegistry.setList(meta.membraneId, payload);
          this.broadcastScenarioList(meta.membraneId, payload.deviceId, entry);
          return;
        }
        if (!this.isValidBoardEnvelope(envelope)) {
          return;
        }
        this.realtimeService.fanOutToCabinet(meta.membraneId, envelope);
        return;
      }
      // PCB6: узел отвечает на health.ping — резолвим ожидающий pingNode.
      if (
        envelope.channel === 'presence' &&
        envelope.type === NODE_REALTIME_EVENT_TYPES.presence.healthPong
      ) {
        const payload = parseHealthPongPayload(envelope.payload);
        if (payload) {
          this.realtimeService.handleHealthPong(payload.pingId);
        }
        return;
      }
      if (
        envelope.channel === 'presence' &&
        envelope.type === NODE_REALTIME_EVENT_TYPES.presence.heartbeat
      ) {
        const payload = parsePresenceHeartbeatPayload(envelope.payload);
        if (payload && payload.deviceId === meta.mediaDeviceId) {
          await this.realtimeService.recordPresenceHeartbeat(payload.deviceId);
        }
        return;
      }
      await this.journalHandler.handleIncoming(meta, envelope);
      return;
    }

    if (meta.role === 'cabinet' && envelope.channel === 'board') {
      if (!this.isValidBoardEnvelope(envelope)) {
        return;
      }
      const deviceId = this.resolveTargetDeviceId(meta, envelope);
      this.realtimeService.fanOutToCabinet(meta.membraneId, envelope);
      if (deviceId) {
        this.realtimeService.sendToNode(deviceId, envelope);
      }
      return;
    }

    // CT2: runtime-команды кабинета — только при активном захвате и в whitelist тарифа.
    if (meta.role === 'cabinet' && envelope.channel === 'runtime') {
      this.dispatchCabinetRuntimeCommand(meta, envelope);
      return;
    }

    if (meta.role === 'cabinet' && envelope.channel === 'mic-live') {
      const deviceId = this.resolveTargetDeviceId(meta, envelope);
      if (deviceId) {
        this.realtimeService.sendToNode(deviceId, envelope);
      }
    }
  }

  /**
   * Enforcement тарифа v2 (канон §4): единственная точка контроля — gateway.
   * Без активного захвата у кабинета нет контроля; вне whitelist → drop
   * (WS-эквивалент 403). UI-блокировки — вторичная косметика.
   */
  private dispatchCabinetRuntimeCommand(
    meta: NodeRealtimeSocketMeta,
    envelope: NodeRealtimeEnvelope,
  ): void {
    if (envelope.type !== NODE_REALTIME_EVENT_TYPES.runtime.command) {
      this.logger.debug({ type: envelope.type }, 'cabinet may only send runtime.command');
      return;
    }
    const command = parseRuntimeCommandPayload(envelope.payload);
    if (!command) {
      this.logger.debug('invalid runtime.command payload');
      return;
    }
    if (!isCabinetRuntimeCommandAllowed(command.action)) {
      this.logger.warn(
        { action: command.action },
        'runtime.command rejected: not in tariff v2 whitelist',
      );
      return;
    }
    const deviceId = this.resolveTargetDeviceId(meta, envelope);
    if (!deviceId) {
      return;
    }
    const capture = this.captureRegistry.get(deviceId);
    if (!capture || capture.membraneId !== meta.membraneId) {
      this.logger.warn(
        { action: command.action, deviceId },
        'runtime.command rejected: device is not captured by cabinet',
      );
      return;
    }
    // CX3: сервер — держатель «выбранного сценария». selectScenario вне
    // объявленного узлом списка отвергается; успешный выбор ре-бродкастится
    // всем кабинетам (единый источник истины для dropdown'ов).
    if (command.action === 'selectScenario') {
      const entry = this.scenarioRegistry.select(deviceId, command.scenarioId);
      if (entry === null) {
        this.logger.warn(
          { deviceId, scenarioId: command.scenarioId },
          'selectScenario rejected: scenario is not in the announced list',
        );
        return;
      }
      this.broadcastScenarioList(meta.membraneId, deviceId, entry);
    }
    this.realtimeService.sendToNode(deviceId, envelope);
  }

  /** CX3: снапшот списка сценариев — кабинетам мембраны (board.scenario-list). */
  private broadcastScenarioList(
    membraneId: string,
    deviceId: string,
    entry: DeviceScenarioEntry,
  ): void {
    this.realtimeService.fanOutToCabinet(
      membraneId,
      createNodeRealtimeEnvelope('board', NODE_REALTIME_EVENT_TYPES.board.scenarioList, {
        deviceId,
        scenarios: entry.scenarios,
        selectedScenarioId: entry.selectedScenarioId,
      }),
    );
  }

  private resolveTargetDeviceId(
    meta: NodeRealtimeSocketMeta,
    envelope: NodeRealtimeEnvelope,
  ): string | null {
    if (envelope.channel === 'runtime' || envelope.channel === 'board') {
      const targetDeviceId = (envelope.payload as { deviceId?: unknown } | null)?.deviceId;
      if (typeof targetDeviceId === 'string' && targetDeviceId.length > 0) {
        return targetDeviceId;
      }
    }
    return meta.mediaDeviceId;
  }

  private isValidBoardEnvelope(envelope: NodeRealtimeEnvelope): boolean {
    // CT2: capture/heartbeat/release создаёт только DeviceCaptureService
    // (REST + broadcast) — входящие по WS отбрасываем (server-authoritative).
    if (
      envelope.type === NODE_REALTIME_EVENT_TYPES.board.capture ||
      envelope.type === NODE_REALTIME_EVENT_TYPES.board.heartbeat ||
      envelope.type === NODE_REALTIME_EVENT_TYPES.board.release
    ) {
      this.logger.debug({ type: envelope.type }, 'board capture events are server-originated');
      return false;
    }
    // CX3: список объявляет только узел (обрабатывается до этой проверки);
    // scenario-list от кабинета — drop (выбор идёт runtime.selectScenario).
    if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.scenarioList) {
      this.logger.debug('board.scenario-list is node-originated');
      return false;
    }
    if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.editLease) {
      if (parseBoardEditLeasePayload(envelope.payload) === null) {
        this.logger.debug({ type: envelope.type }, 'invalid board.edit-lease payload');
        return false;
      }
      return true;
    }
    if (envelope.type === NODE_REALTIME_EVENT_TYPES.board.captureState) {
      if (parseBoardCaptureStatePayload(envelope.payload) === null) {
        this.logger.debug({ type: envelope.type }, 'invalid board.capture-state payload');
        return false;
      }
      return true;
    }
    this.logger.debug({ type: envelope.type }, 'unsupported board event type');
    return false;
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
