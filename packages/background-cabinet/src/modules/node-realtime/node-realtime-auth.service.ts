import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { NodeRealtimeSocketMeta } from './node-realtime.service';

@Injectable()
export class NodeRealtimeAuthService {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  async authenticateNode(token: string, mediaDeviceId: string): Promise<NodeRealtimeSocketMeta> {
    const trimmedToken = token.trim();
    const trimmedDeviceId = mediaDeviceId.trim();
    if (!trimmedToken || !trimmedDeviceId) {
      throw new UnauthorizedException('Missing token or deviceId');
    }

    const user = await this.authService.validateSessionToken(trimmedToken);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const ctx = await this.requireDeviceContext(user.id, trimmedDeviceId);
    return {
      role: 'node',
      userId: user.id,
      membraneId: ctx.membraneId,
      nodeId: ctx.nodeId,
      mediaDeviceId: trimmedDeviceId,
    };
  }

  async authenticateCabinet(token: string, membraneId?: string): Promise<NodeRealtimeSocketMeta> {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      throw new UnauthorizedException('Missing token');
    }

    const user = await this.authService.validateSessionToken(trimmedToken);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const membrane = await this.prisma.membrane.findUnique({
      where: { userId: user.id },
      include: { nodes: { include: { device: true }, take: 1 } },
    });
    if (!membrane) {
      throw new ForbiddenException('Membrane not found');
    }

    const trimmedMembraneId = membraneId?.trim();
    if (trimmedMembraneId && trimmedMembraneId !== membrane.id) {
      throw new ForbiddenException('Membrane scope mismatch');
    }

    const node = membrane.nodes[0];
    return {
      role: 'cabinet',
      userId: user.id,
      membraneId: membrane.id,
      nodeId: node?.id ?? null,
      mediaDeviceId: node?.device?.mediaDeviceId ?? null,
    };
  }

  private async requireDeviceContext(userId: string, mediaDeviceId: string) {
    const membrane = await this.prisma.membrane.findUnique({
      where: { userId },
      include: { nodes: { include: { device: true } } },
    });
    if (!membrane) {
      throw new ForbiddenException('Membrane not found');
    }

    const node = membrane.nodes.find((entry) => entry.device?.mediaDeviceId === mediaDeviceId);
    if (!node?.device) {
      throw new ForbiddenException('Unknown mediaDeviceId for this membrane');
    }

    return {
      membraneId: membrane.id,
      nodeId: node.id,
      mediaDeviceId: node.device.mediaDeviceId,
    };
  }
}
