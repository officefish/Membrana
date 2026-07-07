import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  createNodeRealtimeEnvelope,
  NODE_REALTIME_EVENT_TYPES,
  type BoardCaptureHeartbeatPayload,
  type BoardCapturePayload,
  type BoardCaptureReleasePayload,
  type DeviceCaptureMode,
  type DeviceCaptureReleaseReason,
  type RuntimeCommandPayload,
} from '../../domain/node-realtime-wire';
import {
  CAPTURE_PREEMPTION_FADE_OUT_MS,
  DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS,
  deviceCaptureExpiresAt,
  isDeviceCaptureActive,
} from '../../domain/device-capture';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceCaptureRegistry } from '../node-realtime/device-capture.registry';
import { NodeRealtimeService } from '../node-realtime/node-realtime.service';

export interface DeviceCaptureView {
  readonly deviceId: string;
  readonly mode: DeviceCaptureMode;
  readonly sessionId: string;
  readonly acquiredAt: string;
  readonly expiresAt: string;
}

interface CaptureRow {
  id: string;
  membraneId: string;
  nodeId: string;
  mediaDeviceId: string;
  sessionId: string;
  mode: DeviceCaptureMode;
  acquiredAt: Date;
  expiresAt: Date;
}

function serializeCapture(row: CaptureRow): DeviceCaptureView {
  return {
    deviceId: row.mediaDeviceId,
    mode: row.mode,
    sessionId: row.sessionId,
    acquiredAt: row.acquiredAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

/**
 * Жизненный цикл явного захвата устройства (тариф v2, канон §3):
 * capture/release + heartbeat loop (2 мин) + TTL sweep (5 мин).
 * Release НЕ останавливает играющий сценарий; вытеснение при capture — стоп
 * с graceful fade-out (канон §3.1).
 */
@Injectable()
export class DeviceCaptureService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DeviceCaptureService.name);

  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly nodeRealtime: NodeRealtimeService,
    private readonly registry: DeviceCaptureRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.hydrateRegistry();
    this.heartbeatTimer = setInterval(() => {
      void this.heartbeatSweep().catch((err: unknown) => {
        this.logger.warn({ err }, 'capture heartbeat sweep failed');
      });
    }, DEVICE_CAPTURE_HEARTBEAT_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  async capture(
    userId: string,
    sessionId: string,
    nodeId: string,
    mode: DeviceCaptureMode,
  ): Promise<{ capture: DeviceCaptureView }> {
    const node = await this.loadOwnedNode(userId, nodeId);
    const mediaDeviceId = node.device?.mediaDeviceId;
    if (!mediaDeviceId) {
      throw new NotFoundException('Node is not paired with a field device');
    }

    const now = new Date();
    await this.prisma.nodeDeviceCapture.deleteMany({
      where: { membraneId: node.membraneId, expiresAt: { lte: now } },
    });

    const existing = await this.prisma.nodeDeviceCapture.findUnique({
      where: { nodeId: node.id },
    });
    if (
      existing &&
      isDeviceCaptureActive(existing.expiresAt, now) &&
      existing.sessionId !== sessionId
    ) {
      throw new ConflictException('Device is captured by another cabinet session');
    }

    const expiresAt = deviceCaptureExpiresAt(now);
    const saved = (await this.prisma.nodeDeviceCapture.upsert({
      where: { nodeId: node.id },
      create: {
        membraneId: node.membraneId,
        nodeId: node.id,
        mediaDeviceId,
        sessionId,
        mode,
        acquiredAt: now,
        expiresAt,
      },
      update: { sessionId, mode, expiresAt },
    })) as CaptureRow;

    this.registry.set(mediaDeviceId, {
      membraneId: node.membraneId,
      nodeId: node.id,
      sessionId: saved.sessionId,
      mode: saved.mode,
      expiresAt: saved.expiresAt,
    });

    const capture = serializeCapture(saved);
    this.broadcast(node.membraneId, mediaDeviceId, NODE_REALTIME_EVENT_TYPES.board.capture, {
      deviceId: capture.deviceId,
      mode: capture.mode,
      sessionId: capture.sessionId,
      acquiredAt: capture.acquiredAt,
      expiresAt: capture.expiresAt,
    } satisfies BoardCapturePayload);

    // Вытеснение (канон §3.1): клиентский run без захвата останавливается
    // graceful fade-out'ом. Идемпотентно, если на поле ничего не играет.
    const preemptStop: RuntimeCommandPayload = {
      action: 'stop',
      deviceId: mediaDeviceId,
      fadeOutMs: CAPTURE_PREEMPTION_FADE_OUT_MS,
    };
    this.nodeRealtime.sendToNode(
      mediaDeviceId,
      createNodeRealtimeEnvelope('runtime', NODE_REALTIME_EVENT_TYPES.runtime.command, preemptStop),
    );

    return { capture };
  }

  /**
   * CX2: release — на уровне владельца, БЕЗ проверки сессии-держателя.
   * Захват продлевается heartbeatSweep бессрочно; если держащая сессия умерла
   * (перелогин кабинета), проверка sessionId делала захват неотпускаемым —
   * владелец получал 403 навсегда. Владение узлом проверяет loadOwnedNode;
   * конфликт двух живых сессий остаётся только на capture().
   */
  async release(
    userId: string,
    _sessionId: string,
    nodeId: string,
  ): Promise<{ released: true }> {
    const node = await this.loadOwnedNode(userId, nodeId);
    const mediaDeviceId = node.device?.mediaDeviceId;
    if (!mediaDeviceId) {
      throw new NotFoundException('Node is not paired with a field device');
    }

    const existing = await this.prisma.nodeDeviceCapture.findUnique({
      where: { nodeId: node.id },
    });
    if (!existing) {
      // Идемпотентно: захвата нет — состояние «отпущено» подтверждаем broadcast'ом.
      this.broadcastRelease(node.membraneId, mediaDeviceId, null, 'operator');
      return { released: true };
    }

    await this.prisma.nodeDeviceCapture.delete({ where: { id: existing.id } });
    this.registry.delete(mediaDeviceId);
    // Release = отпускание управления, НЕ стоп играющего сценария (канон §3).
    this.broadcastRelease(node.membraneId, mediaDeviceId, existing.sessionId, 'operator');
    return { released: true };
  }

  /**
   * CX2: активные захваты мембран владельца — bootstrap состояния кабинета.
   * Кабинет забывал захваты при перемонтировании раздела (стейт жил в React),
   * показывая «Захватить» при живом захвате на сервере; снапшот делает сервер
   * единственным источником истины (как presence-снапшот PL1).
   */
  async listForUser(userId: string): Promise<{ captures: DeviceCaptureView[] }> {
    const now = new Date();
    const rows = (await this.prisma.nodeDeviceCapture.findMany({
      where: { membrane: { userId }, expiresAt: { gt: now } },
    })) as CaptureRow[];
    return { captures: rows.map(serializeCapture) };
  }

  /**
   * PL4 (pairing-lifecycle): системный форс-release захвата узла БЕЗ проверки
   * сессии-держателя — вызывается при отзыве/удалении ключа (узел теряет
   * сопряжение осознанно, держать захват над ним бессмысленно). Идемпотентно.
   * Транзиентные разрывы WS НЕ трогают захват (их держит TTL) — решение владельца.
   */
  async forceReleaseByNode(
    nodeId: string,
    reason: DeviceCaptureReleaseReason = 'operator',
  ): Promise<void> {
    const existing = await this.prisma.nodeDeviceCapture.findUnique({ where: { nodeId } });
    if (!existing) return;
    await this.prisma.nodeDeviceCapture.delete({ where: { id: existing.id } });
    this.registry.delete(existing.mediaDeviceId);
    this.broadcastRelease(existing.membraneId, existing.mediaDeviceId, existing.sessionId, reason);
  }

  /**
   * Heartbeat loop (канон §3): живые захваты продлеваются (+TTL, broadcast
   * board.heartbeat); протухшие (например после даунтайма сервера) —
   * release с reason ttl-expired. Публичный для unit-тестов.
   */
  async heartbeatSweep(now: Date = new Date()): Promise<void> {
    const rows = (await this.prisma.nodeDeviceCapture.findMany()) as CaptureRow[];
    for (const row of rows) {
      if (!isDeviceCaptureActive(row.expiresAt, now)) {
        await this.prisma.nodeDeviceCapture.delete({ where: { id: row.id } });
        this.registry.delete(row.mediaDeviceId);
        this.broadcastRelease(row.membraneId, row.mediaDeviceId, null, 'ttl-expired');
        continue;
      }
      const expiresAt = deviceCaptureExpiresAt(now);
      await this.prisma.nodeDeviceCapture.update({
        where: { id: row.id },
        data: { expiresAt },
      });
      this.registry.set(row.mediaDeviceId, {
        membraneId: row.membraneId,
        nodeId: row.nodeId,
        sessionId: row.sessionId,
        mode: row.mode,
        expiresAt,
      });
      this.broadcast(row.membraneId, row.mediaDeviceId, NODE_REALTIME_EVENT_TYPES.board.heartbeat, {
        deviceId: row.mediaDeviceId,
        sessionId: row.sessionId,
        expiresAt: expiresAt.toISOString(),
      } satisfies BoardCaptureHeartbeatPayload);
    }
  }

  /** Восстановление in-memory registry после рестарта (persist → cache). */
  private async hydrateRegistry(): Promise<void> {
    const rows = (await this.prisma.nodeDeviceCapture.findMany()) as CaptureRow[];
    for (const row of rows) {
      this.registry.set(row.mediaDeviceId, {
        membraneId: row.membraneId,
        nodeId: row.nodeId,
        sessionId: row.sessionId,
        mode: row.mode,
        expiresAt: row.expiresAt,
      });
    }
  }

  private async loadOwnedNode(userId: string, nodeId: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: { membrane: true, device: true },
    });
    if (!node) {
      throw new NotFoundException('Node not found');
    }
    if (node.membrane.userId !== userId) {
      throw new ForbiddenException('Node access denied');
    }
    return node;
  }

  private broadcastRelease(
    membraneId: string,
    mediaDeviceId: string,
    sessionId: string | null,
    reason: DeviceCaptureReleaseReason,
  ): void {
    this.broadcast(membraneId, mediaDeviceId, NODE_REALTIME_EVENT_TYPES.board.release, {
      deviceId: mediaDeviceId,
      sessionId,
      reason,
    } satisfies BoardCaptureReleasePayload);
  }

  private broadcast(
    membraneId: string,
    mediaDeviceId: string,
    type: string,
    payload: unknown,
  ): void {
    this.nodeRealtime.broadcastBoardEnvelope(
      membraneId,
      mediaDeviceId,
      createNodeRealtimeEnvelope('board', type, payload),
    );
  }
}
