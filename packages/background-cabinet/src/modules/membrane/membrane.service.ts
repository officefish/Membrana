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
import { isNodeLimitReached, nextNodeLabel } from '../../domain/node-limit';
import { resolvePairedKeyStatus } from '../../domain/paired-key-status';
import { NodeRealtimeService } from '../node-realtime/node-realtime.service';
import { DeviceCaptureService } from '../device-capture/device-capture.service';

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
    maxNodesPerMembrane: tariff.maxNodesPerMembrane,
    maxUserWorkspaces: tariff.maxUserWorkspaces,
  };
}

function serializeNode(node: {
  id: string;
  label: string;
  createdAt: Date;
  accessKeys: Parameters<typeof serializeAccessKey>[0][];
  device?: {
    mediaDeviceId: string;
    label: string | null;
    lastSeenAt: Date;
    pairedKeyId: string | null;
    pairingStatus: 'paired' | 'revoked' | 'unpaired';
  } | null;
}) {
  // #279: производный статус ключа сопряжения — на чтении, без миграций.
  // Ключи уже в выборке (accessKeys), лишних запросов нет.
  const pairedKeyView = node.device
    ? resolvePairedKeyStatus({
        pairingStatus: node.device.pairingStatus,
        pairedKey:
          node.accessKeys.find((key) => key.id === node.device?.pairedKeyId) ?? null,
      })
    : null;
  return {
    id: node.id,
    label: node.label,
    createdAt: node.createdAt.toISOString(),
    accessKeys: node.accessKeys.map(serializeAccessKey),
    device: node.device
      ? {
          mediaDeviceId: node.device.mediaDeviceId,
          label: node.device.label,
          lastSeenAt: node.device.lastSeenAt.toISOString(),
          pairedKeyStatus: pairedKeyView!.status,
          pairedKeyExpiresAt: pairedKeyView!.expiresAt,
        }
      : null,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly nodeRealtime: NodeRealtimeService,
    private readonly deviceCapture: DeviceCaptureService,
  ) {}

  async getOrCreateMembraneForUser(userId: string) {
    const existing = await this.prisma.membrane.findUnique({
      where: { userId },
      include: { tariff: true, nodes: { include: { accessKeys: true, device: true } } },
    });
    if (existing) return existing;

    const tariff = await this.prisma.tariff.findUnique({ where: { id: FREE_TARIFF_ID } });
    if (!tariff) {
      throw new NotFoundException(`Tariff ${FREE_TARIFF_ID} is not seeded`);
    }

    return this.prisma.membrane.create({
      data: { userId, tariffId: tariff.id },
      include: { tariff: true, nodes: { include: { accessKeys: true, device: true } } },
    });
  }

  async getMembraneView(userId: string) {
    const membrane = await this.getOrCreateMembraneForUser(userId);
    const nodes = [...membrane.nodes]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(serializeNode);
    return {
      membrane: {
        id: membrane.id,
        tariff: serializeTariff(membrane.tariff),
        createdAt: membrane.createdAt.toISOString(),
      },
      // MP7b: список всех узлов мембраны. `node` (первый) — для обратной совместимости.
      nodes,
      node: nodes[0] ?? null,
    };
  }

  async createNode(userId: string, label?: string) {
    const membrane = await this.getOrCreateMembraneForUser(userId);
    const nodeCount = await this.prisma.node.count({ where: { membraneId: membrane.id } });
    if (isNodeLimitReached(nodeCount, membrane.tariff.maxNodesPerMembrane)) {
      throw new ConflictException(
        `Node limit reached for tariff (max ${membrane.tariff.maxNodesPerMembrane})`,
      );
    }

    const node = await this.prisma.node.create({
      data: {
        membraneId: membrane.id,
        label: label?.trim() || nextNodeLabel(nodeCount),
      },
      include: { accessKeys: true },
    });

    return { node: serializeNode(node) };
  }

  async deleteNode(userId: string, nodeId: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: { membrane: true, accessKeys: true },
    });
    if (!node) throw new NotFoundException('Node not found');
    if (node.membrane.userId !== userId) throw new ForbiddenException('Node access denied');

    const now = new Date();
    const revokedKeyIds: string[] = [];
    for (const key of node.accessKeys) {
      if (isAccessKeyActive(key.expiresAt, key.revokedAt, now)) {
        await this.revokeAccessKey(userId, key.id);
        revokedKeyIds.push(key.id);
      }
    }

    await this.prisma.node.delete({ where: { id: nodeId } });

    return { deletedNodeId: nodeId, revokedKeyIds };
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
      select: { lastPairSessionToken: true, mediaDeviceId: true },
    });
    if (pairedDevice) {
      if (pairedDevice.lastPairSessionToken) {
        await this.prisma.session.deleteMany({
          where: { token: pairedDevice.lastPairSessionToken },
        });
      }
      // PL2: помечаем устройство revoked (pairedKeyId сохраняем для истории /
      // диагностики getPairStatus — консилиум pairing-lifecycle OQ3).
      await this.prisma.device.updateMany({
        where: { pairedKeyId: keyId },
        data: { lastPairSessionToken: null, pairingStatus: 'revoked' },
      });

      if (pairedDevice.mediaDeviceId) {
        this.nodeRealtime.notifySessionInvalidated(
          pairedDevice.mediaDeviceId,
          key.node.membraneId,
          'revoked',
        );
      }
      // PL4: захват (держится сессией кабинета) над этим узлом бессмысленен —
      // узел теряет сопряжение. Форс-release (broadcast кабинету), не ждём TTL.
      await this.deviceCapture.forceReleaseByNode(key.nodeId);
    }

    return { accessKey: serializeAccessKey(revoked) };
  }

  async purgeRevokedAccessKeys(userId: string, nodeId: string) {
    return this.purgeInactiveAccessKeys(userId, nodeId);
  }

  /** Removes revoked and expired keys; active keys are kept. */
  async purgeInactiveAccessKeys(userId: string, nodeId: string) {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      include: { membrane: true },
    });
    if (!node) throw new NotFoundException('Node not found');
    if (node.membrane.userId !== userId) throw new ForbiddenException('Node access denied');

    const now = new Date();
    const result = await this.prisma.nodeAccessKey.deleteMany({
      where: {
        nodeId: node.id,
        OR: [{ revokedAt: { not: null } }, { expiresAt: { lt: now } }],
      },
    });

    return { deletedCount: result.count };
  }

  /**
   * PL3 (pairing-lifecycle): «Удалить» = revoke + delete одной операцией
   * (решение владельца). Активный ключ больше НЕ даёт 409 — сначала отзыв
   * (real-time invalidate узла + pairingStatus='revoked'), затем удаление.
   * `Device.pairedKeyId` — не FK, поэтому чистим ссылку явно и переводим
   * устройство в 'unpaired' (ключ больше не существует).
   */
  async deleteAccessKey(userId: string, keyId: string) {
    const key = await this.prisma.nodeAccessKey.findUnique({
      where: { id: keyId },
      include: { node: { include: { membrane: true } } },
    });
    if (!key) throw new NotFoundException('Access key not found');
    if (key.node.membrane.userId !== userId) {
      throw new ForbiddenException('Access key access denied');
    }

    // Активный ключ: отзыв (idempotent, шлёт notify узлу + помечает revoked).
    if (isAccessKeyActive(key.expiresAt, key.revokedAt)) {
      await this.revokeAccessKey(userId, keyId);
    }

    // Отвязка на уровне устройства: ключ удаляется, ссылка на него больше не
    // имеет смысла — чистим pairedKeyId и переводим в unpaired.
    await this.prisma.device.updateMany({
      where: { pairedKeyId: keyId },
      data: { pairedKeyId: null, pairingStatus: 'unpaired' },
    });

    // PL4: гарантируем release даже для неактивного ключа (revoke выше не вызывался).
    await this.deviceCapture.forceReleaseByNode(key.nodeId);

    await this.prisma.nodeAccessKey.delete({ where: { id: keyId } });

    return { deletedKeyId: keyId };
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
        maxNodesPerMembrane: 1,
        maxUserWorkspaces: 3,
      },
      update: {
        datasetCatalogId: FREE_DATASET_CATALOG_ID,
        maxNodesPerMembrane: 1,
        maxUserWorkspaces: 3,
      },
    });
  }
}
