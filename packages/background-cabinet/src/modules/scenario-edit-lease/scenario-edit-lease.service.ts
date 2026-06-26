import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  createNodeRealtimeEnvelope,
  NODE_REALTIME_EVENT_TYPES,
  type BoardEditLeasePayload,
} from '../../domain/node-realtime-wire';
import {
  isScenarioEditLeaseActive,
  scenarioEditLeaseExpiresAt,
} from '../../domain/scenario-edit-lease';
import { PrismaService } from '../../prisma/prisma.service';
import { NodeRealtimeService } from '../node-realtime/node-realtime.service';

export interface ScenarioEditLeaseView {
  readonly deviceId: string;
  readonly holder: BoardEditLeasePayload['holder'];
  readonly sessionId: string | null;
  readonly revision: number;
  readonly expiresAt: string | null;
}

function serializeLease(row: {
  mediaDeviceId: string;
  sessionId: string;
  revision: number;
  expiresAt: Date;
}): ScenarioEditLeaseView {
  return {
    deviceId: row.mediaDeviceId,
    holder: 'cabinet',
    sessionId: row.sessionId,
    revision: row.revision,
    expiresAt: row.expiresAt.toISOString(),
  };
}

function serializeReleased(mediaDeviceId: string, revision: number): ScenarioEditLeaseView {
  return {
    deviceId: mediaDeviceId,
    holder: 'none',
    sessionId: null,
    revision,
    expiresAt: null,
  };
}

@Injectable()
export class ScenarioEditLeaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nodeRealtime: NodeRealtimeService,
  ) {}

  async acquire(
    userId: string,
    sessionId: string,
    nodeId: string,
    revision: number,
  ): Promise<{ lease: ScenarioEditLeaseView }> {
    const node = await this.loadOwnedNode(userId, nodeId);
    const mediaDeviceId = node.device?.mediaDeviceId;
    if (!mediaDeviceId) {
      throw new NotFoundException('Node is not paired with a field device');
    }

    const now = new Date();
    await this.prisma.nodeScenarioEditLease.deleteMany({
      where: { membraneId: node.membraneId, expiresAt: { lte: now } },
    });

    const existing = await this.prisma.nodeScenarioEditLease.findUnique({
      where: { membraneId_mediaDeviceId: { membraneId: node.membraneId, mediaDeviceId } },
    });

    if (existing && isScenarioEditLeaseActive(existing.expiresAt, now)) {
      if (existing.sessionId !== sessionId) {
        throw new ConflictException('Edit lease is held by another cabinet session');
      }
      const renewed = await this.prisma.nodeScenarioEditLease.update({
        where: { id: existing.id },
        data: { revision, expiresAt: scenarioEditLeaseExpiresAt(now) },
      });
      const lease = serializeLease(renewed);
      this.broadcastLease(node.membraneId, mediaDeviceId, lease);
      return { lease };
    }

    const expiresAt = scenarioEditLeaseExpiresAt(now);
    const saved = await this.prisma.nodeScenarioEditLease.upsert({
      where: { nodeId: node.id },
      create: {
        membraneId: node.membraneId,
        nodeId: node.id,
        mediaDeviceId,
        sessionId,
        revision,
        expiresAt,
      },
      update: {
        sessionId,
        revision,
        expiresAt,
      },
    });

    const lease = serializeLease(saved);
    this.broadcastLease(node.membraneId, mediaDeviceId, lease);
    return { lease };
  }

  async renew(
    userId: string,
    sessionId: string,
    nodeId: string,
    revision?: number,
  ): Promise<{ lease: ScenarioEditLeaseView }> {
    const node = await this.loadOwnedNode(userId, nodeId);
    const mediaDeviceId = node.device?.mediaDeviceId;
    if (!mediaDeviceId) {
      throw new NotFoundException('Node is not paired with a field device');
    }

    const existing = await this.prisma.nodeScenarioEditLease.findUnique({
      where: { nodeId: node.id },
    });
    if (!existing || !isScenarioEditLeaseActive(existing.expiresAt)) {
      throw new ConflictException('No active edit lease for this node');
    }
    if (existing.sessionId !== sessionId) {
      throw new ForbiddenException('Edit lease is held by another cabinet session');
    }

    const renewed = await this.prisma.nodeScenarioEditLease.update({
      where: { id: existing.id },
      data: {
        expiresAt: scenarioEditLeaseExpiresAt(),
        ...(revision !== undefined ? { revision } : {}),
      },
    });

    const lease = serializeLease(renewed);
    this.broadcastLease(node.membraneId, mediaDeviceId, lease);
    return { lease };
  }

  async release(
    userId: string,
    sessionId: string,
    nodeId: string,
  ): Promise<{ lease: ScenarioEditLeaseView }> {
    const node = await this.loadOwnedNode(userId, nodeId);
    const mediaDeviceId = node.device?.mediaDeviceId;
    if (!mediaDeviceId) {
      throw new NotFoundException('Node is not paired with a field device');
    }

    const existing = await this.prisma.nodeScenarioEditLease.findUnique({
      where: { nodeId: node.id },
    });
    if (!existing) {
      const lease = serializeReleased(mediaDeviceId, 0);
      this.broadcastLease(node.membraneId, mediaDeviceId, lease);
      return { lease };
    }
    if (existing.sessionId !== sessionId) {
      throw new ForbiddenException('Edit lease is held by another cabinet session');
    }

    await this.prisma.nodeScenarioEditLease.delete({ where: { id: existing.id } });
    const lease = serializeReleased(mediaDeviceId, existing.revision);
    this.broadcastLease(node.membraneId, mediaDeviceId, lease);
    return { lease };
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

  private broadcastLease(
    membraneId: string,
    mediaDeviceId: string,
    lease: ScenarioEditLeaseView,
  ): void {
    const payload: BoardEditLeasePayload = {
      deviceId: lease.deviceId,
      holder: lease.holder,
      sessionId: lease.sessionId,
      revision: lease.revision,
      expiresAt: lease.expiresAt,
    };
    const envelope = createNodeRealtimeEnvelope(
      'board',
      NODE_REALTIME_EVENT_TYPES.board.editLease,
      payload,
    );
    this.nodeRealtime.broadcastBoardEnvelope(membraneId, mediaDeviceId, envelope);
  }
}
