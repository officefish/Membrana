import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NodeRealtimeService } from '../node-realtime/node-realtime.service';

/**
 * PCB4 (presence-capture-board): достоверное состояние связи узла для кабинета.
 * `paired` — из БД (сопряжение осознанно), `live` — из in-memory реестра сокетов
 * (реальное присутствие WS), `lastSeenAt` — из БД (для «виден N назад» когда !live).
 */
export interface NodeLinkStateView {
  readonly paired: boolean;
  readonly live: boolean;
  readonly lastSeenAt: string | null;
}

@Injectable()
export class NodeLinkStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nodeRealtime: NodeRealtimeService,
  ) {}

  async linkState(userId: string, nodeId: string): Promise<NodeLinkStateView> {
    const node = await this.loadOwnedNode(userId, nodeId);
    const device = node.device;
    // Сопряжён = есть привязанное устройство в статусе paired (revoked/unpaired — нет).
    const paired = device != null && device.pairingStatus === 'paired';
    const live = paired ? this.nodeRealtime.isDeviceLive(device!.mediaDeviceId) : false;
    return {
      paired,
      live,
      lastSeenAt: device?.lastSeenAt?.toISOString() ?? null,
    };
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
}
