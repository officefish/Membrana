import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { NodeAccessKeyDuration, Tariff } from '../../prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  computeAccessKeyExpiresAt,
  isAccessKeyActive,
  isNodeAccessKeyDuration,
} from '../../domain/node-access-key-duration';
import {
  createAccessKeySecret,
  hashAccessKeySecret,
} from './access-key.util';

const FREE_TARIFF_ID = 'free-v1';
const FREE_DATASET_CATALOG_ID = 'free-v1-catalog';
const GIB = 1024n * 1024n * 1024n;

function serializeTariff(tariff: Tariff) {
  return {
    id: tariff.id,
    name: tariff.name,
    userStorageQuotaBytes: tariff.userStorageQuotaBytes.toString(),
    bufferQuotaBytes: tariff.bufferQuotaBytes.toString(),
    datasetCatalogId: tariff.datasetCatalogId,
    maxActiveKeysPerNode: tariff.maxActiveKeysPerNode,
  };
}

function serializeAccessKey(key: {
  id: string;
  duration: NodeAccessKeyDuration;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}) {
  const now = new Date();
  return {
    id: key.id,
    duration: key.duration,
    expiresAt: key.expiresAt.toISOString(),
    revokedAt: key.revokedAt?.toISOString() ?? null,
    createdAt: key.createdAt.toISOString(),
    active: isAccessKeyActive(key.expiresAt, key.revokedAt, now),
  };
}

@Injectable()
export class MembraneService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateMembraneForUser(userId: string) {
    const existing = await this.prisma.membrane.findUnique({
      where: { userId },
      include: { tariff: true, nodes: { include: { accessKeys: true } } },
    });
    if (existing) return existing;

    const tariff = await this.prisma.tariff.findUnique({ where: { id: FREE_TARIFF_ID } });
    if (!tariff) {
      throw new NotFoundException(`Tariff ${FREE_TARIFF_ID} is not seeded`);
    }

    return this.prisma.membrane.create({
      data: { userId, tariffId: tariff.id },
      include: { tariff: true, nodes: { include: { accessKeys: true } } },
    });
  }

  async getMembraneView(userId: string) {
    const membrane = await this.getOrCreateMembraneForUser(userId);
    const node = membrane.nodes[0] ?? null;
    return {
      membrane: {
        id: membrane.id,
        tariff: serializeTariff(membrane.tariff),
        createdAt: membrane.createdAt.toISOString(),
      },
      node: node
        ? {
            id: node.id,
            label: node.label,
            createdAt: node.createdAt.toISOString(),
            accessKeys: node.accessKeys.map(serializeAccessKey),
          }
        : null,
    };
  }

  async createNode(userId: string, label?: string) {
    const membrane = await this.getOrCreateMembraneForUser(userId);
    const existingNode = await this.prisma.node.findUnique({ where: { membraneId: membrane.id } });
    if (existingNode) {
      throw new ConflictException('Membrane already has a node (v1 limit: 1)');
    }

    const node = await this.prisma.node.create({
      data: {
        membraneId: membrane.id,
        label: label?.trim() || 'Узел 1',
      },
      include: { accessKeys: true },
    });

    return {
      node: {
        id: node.id,
        label: node.label,
        createdAt: node.createdAt.toISOString(),
        accessKeys: node.accessKeys.map(serializeAccessKey),
      },
    };
  }

  async createAccessKey(userId: string, nodeId: string, durationRaw: string) {
    if (!isNodeAccessKeyDuration(durationRaw)) {
      throw new BadRequestException('Invalid duration');
    }
    const duration = durationRaw;

    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: { membrane: { include: { tariff: true } }, accessKeys: true },
    });
    if (!node) throw new NotFoundException('Node not found');
    if (node.membrane.userId !== userId) throw new ForbiddenException('Node access denied');

    const now = new Date();
    const activeCount = node.accessKeys.filter((k) =>
      isAccessKeyActive(k.expiresAt, k.revokedAt, now),
    ).length;
    if (activeCount >= node.membrane.tariff.maxActiveKeysPerNode) {
      throw new ConflictException('Active key limit reached for this node');
    }

    const plainKey = createAccessKeySecret();
    const secretHash = await hashAccessKeySecret(plainKey);
    const createdAt = new Date();
    const expiresAt = computeAccessKeyExpiresAt(duration, createdAt);

    const key = await this.prisma.nodeAccessKey.create({
      data: {
        nodeId: node.id,
        secretHash,
        duration,
        expiresAt,
      },
    });

    return {
      key: plainKey,
      accessKey: serializeAccessKey(key),
    };
  }

  async revokeAccessKey(userId: string, keyId: string) {
    const key = await this.prisma.nodeAccessKey.findUnique({
      where: { id: keyId },
      include: { node: { include: { membrane: true } } },
    });
    if (!key) throw new NotFoundException('Access key not found');
    if (key.node.membrane.userId !== userId) {
      throw new ForbiddenException('Access key access denied');
    }
    if (key.revokedAt) {
      return { accessKey: serializeAccessKey(key) };
    }

    const revoked = await this.prisma.nodeAccessKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    const pairedDevice = await this.prisma.device.findFirst({
      where: { pairedKeyId: keyId },
      select: { lastPairSessionToken: true },
    });
    if (pairedDevice?.lastPairSessionToken) {
      await this.prisma.session.deleteMany({
        where: { token: pairedDevice.lastPairSessionToken },
      });
      await this.prisma.device.updateMany({
        where: { pairedKeyId: keyId },
        data: { lastPairSessionToken: null },
      });
    }

    return { accessKey: serializeAccessKey(revoked) };
  }

  async purgeRevokedAccessKeys(userId: string, nodeId: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: { membrane: true },
    });
    if (!node) throw new NotFoundException('Node not found');
    if (node.membrane.userId !== userId) throw new ForbiddenException('Node access denied');

    const result = await this.prisma.nodeAccessKey.deleteMany({
      where: { nodeId: node.id, revokedAt: { not: null } },
    });

    return { deletedCount: result.count };
  }

  /** Ensures free-v1 tariff exists (idempotent, used by seed). */
  async ensureFreeTariff(): Promise<void> {
    await this.prisma.tariff.upsert({
      where: { id: FREE_TARIFF_ID },
      create: {
        id: FREE_TARIFF_ID,
        name: 'Free v1',
        userStorageQuotaBytes: GIB,
        bufferQuotaBytes: GIB,
        datasetCatalogId: FREE_DATASET_CATALOG_ID,
        maxActiveKeysPerNode: 1,
      },
      update: {
        datasetCatalogId: FREE_DATASET_CATALOG_ID,
      },
    });
  }
}
