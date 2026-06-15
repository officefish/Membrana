import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Collection, CollectionKind } from '../../prisma/client';
import {
  BUFFER_COLLECTION_ID,
  TARIFF_DATASET_COLLECTION_ID,
  TARIFF_DATASET_SYSTEM_KEY,
} from '../../lib/collection-ids';
import { collectionToDto, type CollectionDto } from '../../lib/sample-dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(deviceId: string): Promise<CollectionDto[]> {
    const rows = await this.prisma.collection.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { samples: true } } },
    });
    return rows.map((row) => collectionToDto(row, row._count.samples));
  }

  async createUser(deviceId: string, name: string): Promise<CollectionDto> {
    const row = await this.prisma.collection.create({
      data: {
        id: randomUUID(),
        deviceId,
        name,
        kind: 'user',
      },
    });
    return collectionToDto(row, 0);
  }

  async delete(deviceId: string, collectionId: string): Promise<void> {
    const row = await this.getOwned(deviceId, collectionId);
    if (row.kind === 'buffer' || row.kind === 'system') {
      throw new BadRequestException('Cannot delete reserved collection');
    }
    await this.prisma.collection.delete({
      where: { deviceId_id: { deviceId, id: collectionId } },
    });
  }

  async ensureReserved(deviceId: string): Promise<CollectionDto[]> {
    const existing = await this.prisma.collection.findMany({ where: { deviceId } });
    const byId = new Map(existing.map((c) => [c.id, c]));

    const toCreate: Array<{
      id: string;
      name: string;
      kind: CollectionKind;
      systemKey?: string;
    }> = [];

    if (!byId.has(BUFFER_COLLECTION_ID)) {
      toCreate.push({
        id: BUFFER_COLLECTION_ID,
        name: 'Buffer',
        kind: 'buffer',
      });
    }
    if (!byId.has(TARIFF_DATASET_COLLECTION_ID)) {
      toCreate.push({
        id: TARIFF_DATASET_COLLECTION_ID,
        name: 'Базовый набор (free-v1)',
        kind: 'system',
        systemKey: TARIFF_DATASET_SYSTEM_KEY,
      });
    }

    for (const spec of toCreate) {
      await this.prisma.collection.create({
        data: {
          id: spec.id,
          deviceId,
          name: spec.name,
          kind: spec.kind,
          systemKey: spec.systemKey,
        },
      });
    }

    return this.list(deviceId);
  }

  async getOwned(deviceId: string, collectionId: string): Promise<Collection> {
    const row = await this.prisma.collection.findFirst({
      where: { id: collectionId, deviceId },
    });
    if (!row) {
      throw new NotFoundException(`Collection ${collectionId} not found for device`);
    }
    return row;
  }
}
