import { ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CabinetUnreachableException } from '../../common/incident/failure-genus';
import type { PrismaService } from '../../prisma/prisma.service';
import type { FrozenArchiveStatus } from '../pair/media-bridge.service';

import { MembraneService, NODE_HAS_FROZEN_ARCHIVE } from './membrane.service';

describe('MembraneService tariff view', () => {
  it('serializes tariff contract version and active key limit in /membrane view', async () => {
    const createdAt = new Date('2026-09-09T00:00:00.000Z');
    const prisma = {
      membrane: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'membrane-1',
          createdAt,
          tariff: {
            id: 'free-v1',
            name: 'Датчик',
            tariffContractVersion: 7,
            userStorageQuotaBytes: 536870912n,
            bufferQuotaBytes: 1073741824n,
            datasetCatalogId: 'free-v1-catalog',
            entitledTariffSkus: [],
            maxActiveKeysPerNode: 3,
            maxNodesPerMembrane: 1,
            maxUserWorkspaces: 3,
          },
          nodes: [],
        }),
      },
      membraneBufferPolicy: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;
    const service = new MembraneService(prisma, {} as never, {} as never, {} as never);

    const view = await service.getMembraneView('user-1');

    expect(view.membrane.tariff).toMatchObject({
      id: 'free-v1',
      tariffContractVersion: 7,
      maxActiveKeysPerNode: 3,
      maxNodesPerMembrane: 1,
      maxUserWorkspaces: 3,
    });
  });
});

describe('MembraneService.deleteNode: запрет при замороженном архиве (#2632 g8b, Т3)', () => {
  const FUTURE = new Date('2099-01-01T00:00:00.000Z');

  function harness(opts: { device?: { mediaDeviceId: string } | null; archive: () => Promise<FrozenArchiveStatus> }) {
    const node = {
      id: 'node-1',
      membraneId: 'membrane-1',
      membrane: { id: 'membrane-1', userId: 'user-1' },
      accessKeys: [{ id: 'key-1', expiresAt: FUTURE, revokedAt: null }],
      device: opts.device === undefined ? { mediaDeviceId: 'dev-1' } : opts.device,
    };
    const prisma = {
      node: {
        findUnique: vi.fn().mockResolvedValue(node),
        delete: vi.fn().mockResolvedValue(node),
      },
      nodeAccessKey: {
        findUnique: vi.fn().mockResolvedValue({ ...node.accessKeys[0], node }),
        update: vi.fn().mockResolvedValue({ ...node.accessKeys[0], revokedAt: new Date(), createdAt: new Date(), duration: 'days_3' }),
      },
      device: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const mediaBridge = { hasFrozenArchive: vi.fn(opts.archive), revokeClientKey: vi.fn() };
    const service = new MembraneService(
      prisma as unknown as PrismaService,
      { notifySessionInvalidated: vi.fn() } as never,
      { forceReleaseByNode: vi.fn() } as never,
      mediaBridge as never,
    );
    return { service, prisma, mediaBridge };
  }

  it('архив есть → 409 node_has_frozen_archive с ближайшим сроком; узел и ключи целы', async () => {
    const { service, prisma, mediaBridge } = harness({
      archive: async () => ({ frozen: true, batchCount: 2, nearestExpiresAt: '2026-11-05T10:00:00.000Z' }),
    });
    const error = await service.deleteNode('user-1', 'node-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: NODE_HAS_FROZEN_ARCHIVE,
      nodeId: 'node-1',
      mediaDeviceId: 'dev-1',
      batchCount: 2,
      nearestExpiresAt: '2026-11-05T10:00:00.000Z',
    });
    expect(mediaBridge.hasFrozenArchive).toHaveBeenCalledWith('dev-1');
    // Порча «проверка после отзыва» → красный: ключ не тронут, узел не удалён.
    expect(prisma.nodeAccessKey.update).not.toHaveBeenCalled();
    expect(prisma.node.delete).not.toHaveBeenCalled();
  });

  it('media недоступна → 503 рода unreachable; узел и ключи целы (fail-closed)', async () => {
    const { service, prisma } = harness({
      archive: async () => {
        throw new ServiceUnavailableException('Media server unreachable: ECONNREFUSED');
      },
    });
    const error = await service.deleteNode('user-1', 'node-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(CabinetUnreachableException);
    expect((error as CabinetUnreachableException).getStatus()).toBe(503);
    expect((error as CabinetUnreachableException).dependency).toBe('media');
    expect(prisma.nodeAccessKey.update).not.toHaveBeenCalled();
    expect(prisma.node.delete).not.toHaveBeenCalled();
  });

  it('архива нет → удаление идёт как раньше: ключ отозван, узел удалён', async () => {
    const { service, prisma } = harness({ archive: async () => ({ frozen: false }) });
    await expect(service.deleteNode('user-1', 'node-1')).resolves.toEqual({
      deletedNodeId: 'node-1',
      revokedKeyIds: ['key-1'],
    });
    expect(prisma.nodeAccessKey.update).toHaveBeenCalledTimes(1);
    expect(prisma.node.delete).toHaveBeenCalledWith({ where: { id: 'node-1' } });
  });

  it('узел без прибора → media не спрашивается, удаление идёт', async () => {
    const { service, prisma, mediaBridge } = harness({ device: null, archive: async () => ({ frozen: false }) });
    await service.deleteNode('user-1', 'node-1');
    expect(mediaBridge.hasFrozenArchive).not.toHaveBeenCalled();
    expect(prisma.node.delete).toHaveBeenCalledTimes(1);
  });

  it('чужой узел → 403 раньше, чем вопрос к media', async () => {
    const { service, mediaBridge } = harness({ archive: async () => ({ frozen: false }) });
    await expect(service.deleteNode('user-2', 'node-1')).rejects.toBeInstanceOf(ForbiddenException);
    expect(mediaBridge.hasFrozenArchive).not.toHaveBeenCalled();
  });
});
