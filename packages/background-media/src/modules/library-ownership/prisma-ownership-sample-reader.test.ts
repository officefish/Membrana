/**
 * Зуб DoD 5: в хранилище ось владения превращается в соединение по `device.membraneId`,
 * а не в фильтр по `deviceId` или `collectionId`.
 *
 * Клиент замещён моком: сгенерированного Prisma-клиента в дереве блока нет, и зависеть от него
 * ось не должна.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PrismaOwnershipSampleReader,
  ownershipWhere,
  type OwnershipPrismaLike,
} from './prisma-ownership-sample-reader';

describe('ownershipWhere', () => {
  it('строит соединение по мембране', () => {
    expect(ownershipWhere({ membraneId: 'membrane-A' })).toEqual({
      device: { membraneId: 'membrane-A' },
    });
  });

  it('не строит фильтра по deviceId и collectionId ни при каких входных данных', () => {
    const serialized = JSON.stringify(
      ownershipWhere({
        membraneId: 'membrane-A',
        createdFrom: new Date('2026-08-01'),
        createdTo: new Date('2026-08-02'),
      }),
    );
    expect(serialized).not.toContain('deviceId');
    expect(serialized).not.toContain('collectionId');
    expect(serialized).toContain('membraneId');
  });

  it('окно дат едет как gte/lte, и только когда задано', () => {
    const from = new Date('2026-08-01T00:00:00.000Z');
    expect(ownershipWhere({ membraneId: 'm', createdFrom: from })).toEqual({
      device: { membraneId: 'm' },
      createdAt: { gte: from },
    });
    expect(ownershipWhere({ membraneId: 'm' })).not.toHaveProperty('createdAt');
  });
});

describe('PrismaOwnershipSampleReader', () => {
  const count = vi.fn();
  const findMany = vi.fn();
  const prisma = { sample: { count, findMany } } as unknown as OwnershipPrismaLike;
  let reader: PrismaOwnershipSampleReader;

  beforeEach(() => {
    vi.clearAllMocks();
    count.mockResolvedValue(3);
    findMany.mockResolvedValue([]);
    reader = new PrismaOwnershipSampleReader(prisma);
  });

  it('count спрашивает хранилище по мембране', async () => {
    await expect(reader.count({ membraneId: 'membrane-A' })).resolves.toBe(3);
    expect(count).toHaveBeenCalledWith({ where: { device: { membraneId: 'membrane-A' } } });
  });

  it('findPage просит ТОЛЬКО поля проекции — без storageRef и notes', async () => {
    await reader.findPage({ membraneId: 'membrane-A' }, { skip: 40, take: 20 });
    const args = findMany.mock.calls[0]?.[0] as { select: Record<string, boolean> };
    expect(Object.keys(args.select).sort()).toEqual([
      'collectionId',
      'createdAt',
      'deviceId',
      'id',
    ]);
  });

  it('findPage передаёт страницу и порядок, а область — мембранную', async () => {
    await reader.findPage({ membraneId: 'membrane-A' }, { skip: 40, take: 20 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { device: { membraneId: 'membrane-A' } },
        orderBy: { createdAt: 'desc' },
        skip: 40,
        take: 20,
      }),
    );
  });
});
