/**
 * Адаптер порта чтения к Prisma.
 *
 * Клиент типизирован СТРУКТУРНО (`OwnershipPrismaLike`), а не импортом из
 * `../../prisma/client`. Две причины, обе по делу: блок обязан собираться и проверяться там,
 * где `prisma generate` ещё не гонялся (в дереве блока сгенерированного клиента нет), и порт
 * должен оставаться подменяемым без Prisma вообще.
 *
 * Существо адаптера — одна строка `where`: соединение по `device.membraneId`. Фильтра по
 * `deviceId` или `collectionId` здесь нет и быть не может — это и есть ось владения в
 * хранилище. Индекс под него в стволе уже стоит: `@@index([membraneId])` на `Device`.
 */

import { Injectable } from '@nestjs/common';

import type { OwnershipSampleFilter } from './ownership-scope';
import type {
  OwnershipPageRequest,
  OwnershipSampleReader,
  OwnershipSampleRow,
} from './ownership-sample-reader';

interface PrismaSampleWhere {
  readonly device: { readonly membraneId: string };
  readonly createdAt?: { readonly gte?: Date; readonly lte?: Date };
}

/** Минимум, который блоку нужен от клиента. Ничего сверх — ничего и не просим. */
export interface OwnershipPrismaLike {
  readonly sample: {
    count(args: { where: PrismaSampleWhere }): Promise<number>;
    findMany(args: {
      where: PrismaSampleWhere;
      select: { id: true; deviceId: true; collectionId: true; createdAt: true };
      orderBy: { createdAt: 'desc' };
      skip: number;
      take: number;
    }): Promise<readonly OwnershipSampleRow[]>;
  };
}

export function ownershipWhere(filter: OwnershipSampleFilter): PrismaSampleWhere {
  const createdAt = {
    ...(filter.createdFrom !== undefined ? { gte: filter.createdFrom } : {}),
    ...(filter.createdTo !== undefined ? { lte: filter.createdTo } : {}),
  };
  return {
    device: { membraneId: filter.membraneId },
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
  };
}

@Injectable()
export class PrismaOwnershipSampleReader implements OwnershipSampleReader {
  constructor(private readonly prisma: OwnershipPrismaLike) {}

  async count(filter: OwnershipSampleFilter): Promise<number> {
    return this.prisma.sample.count({ where: ownershipWhere(filter) });
  }

  async findPage(
    filter: OwnershipSampleFilter,
    page: OwnershipPageRequest,
  ): Promise<readonly OwnershipSampleRow[]> {
    return this.prisma.sample.findMany({
      where: ownershipWhere(filter),
      select: { id: true, deviceId: true, collectionId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: page.skip,
      take: page.take,
    });
  }
}
