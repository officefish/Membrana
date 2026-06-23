import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { NodeAccessKey } from '../../prisma/client';
import { isAccessKeyActive } from '../../domain/node-access-key-duration';
import { verifyAccessKeySecret } from '../membrane/access-key.util';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { MediaBridgeService } from './media-bridge.service';

function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

@Injectable()
export class PairService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mediaBridge: MediaBridgeService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async pair(accessKeyRaw: string, clientLabel?: string) {
    const accessKey = accessKeyRaw.trim();
    if (!accessKey) {
      throw new UnauthorizedException('Invalid access key');
    }

    const matched = await this.resolveAccessKey(accessKey);
    if (!matched) {
      throw new UnauthorizedException('Invalid or expired access key');
    }

    const node = await this.prisma.node.findUnique({
      where: { id: matched.nodeId },
      include: {
        membrane: { include: { user: true, tariff: true } },
        device: true,
      },
    });
    if (!node) {
      throw new UnauthorizedException('Invalid or expired access key');
    }

    const now = new Date();
    let mediaDeviceId = node.device?.mediaDeviceId ?? null;
    const membraneContext = {
      membraneId: node.membrane.id,
      userStorageQuotaBytes: node.membrane.tariff.userStorageQuotaBytes.toString(),
      bufferQuotaBytes: node.membrane.tariff.bufferQuotaBytes.toString(),
      datasetCatalogId: node.membrane.tariff.datasetCatalogId,
      maxUserWorkspaces: node.membrane.tariff.maxUserWorkspaces,
    };

    if (!mediaDeviceId) {
      const label = clientLabel?.trim() || node.label;
      const mediaDevice = await this.mediaBridge.registerDevice(label, membraneContext);
      mediaDeviceId = mediaDevice.id;
      await this.mediaBridge.ensureReservedCollections(mediaDeviceId);
      await this.prisma.device.create({
        data: {
          nodeId: node.id,
          mediaDeviceId,
          label,
          pairedKeyId: matched.id,
          lastSeenAt: now,
        },
      });
    } else {
      await this.mediaBridge.syncMembraneContext(mediaDeviceId, membraneContext);
      await this.mediaBridge.ensureReservedCollections(mediaDeviceId);
      await this.prisma.device.update({
        where: { nodeId: node.id },
        data: {
          lastSeenAt: now,
          pairedKeyId: matched.id,
          ...(clientLabel?.trim() ? { label: clientLabel.trim() } : {}),
        },
      });
    }

    const sessionTtl = new Date(now.getTime() + this.config.SESSION_TTL_HOURS * 60 * 60 * 1000);
    const sessionExpiresAt = minDate(matched.expiresAt, sessionTtl);
    const session = await this.authService.createSessionForUserWithExpiry(
      node.membrane.user.id,
      node.membrane.user.login,
      node.membrane.user.role,
      sessionExpiresAt,
    );

    await this.prisma.device.update({
      where: { nodeId: node.id },
      data: { lastPairSessionToken: session.token },
    });

    return {
      token: session.token,
      expiresAt: session.expiresAt,
      deviceId: mediaDeviceId,
      mediaToken: this.config.MEDIA_API_TOKEN,
      mediaApiUrl: this.config.MEDIA_PUBLIC_API_URL,
      membrane: { id: node.membrane.id },
      node: { id: node.id, label: node.label },
      pairedKeyId: matched.id,
      tariff: {
        id: node.membrane.tariff.id,
        maxUserWorkspaces: node.membrane.tariff.maxUserWorkspaces,
      },
    };
  }

  async getPairStatus(userId: string, sessionToken: string) {
    const membrane = await this.prisma.membrane.findUnique({
      where: { userId },
      include: {
        tariff: true,
        nodes: {
          include: { device: true },
          take: 1,
        },
      },
    });

    const node = membrane?.nodes[0];
    const device = node?.device;
    if (!membrane || !node || !device) {
      return { linked: false as const };
    }

    const session = await this.prisma.session.findUnique({ where: { token: sessionToken } });

    let keyActive = false;
    let inactiveReason: 'revoked' | 'expired' | null = null;

    if (device.pairedKeyId) {
      const key = await this.prisma.nodeAccessKey.findUnique({
        where: { id: device.pairedKeyId },
      });
      if (key) {
        keyActive = isAccessKeyActive(key.expiresAt, key.revokedAt);
        if (!keyActive) {
          inactiveReason = key.revokedAt ? 'revoked' : 'expired';
        }
      } else {
        inactiveReason = 'revoked';
      }
    }

    return {
      linked: true as const,
      keyActive,
      inactiveReason,
      membrane: { id: membrane.id },
      node: { id: node.id, label: node.label },
      deviceId: device.mediaDeviceId,
      pairedKeyId: device.pairedKeyId,
      sessionExpiresAt: session?.expiresAt.toISOString() ?? null,
      tariff: {
        id: membrane.tariff.id,
        maxUserWorkspaces: membrane.tariff.maxUserWorkspaces,
      },
    };
  }

  private async resolveAccessKey(plain: string): Promise<NodeAccessKey | null> {
    const now = new Date();
    const candidates = await this.prisma.nodeAccessKey.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: now },
      },
    });

    for (const key of candidates) {
      if (!isAccessKeyActive(key.expiresAt, key.revokedAt, now)) continue;
      const ok = await verifyAccessKeySecret(plain, key.secretHash);
      if (ok) return key;
    }
    return null;
  }
}
