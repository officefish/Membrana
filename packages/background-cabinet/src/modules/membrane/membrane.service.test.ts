import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../../prisma/prisma.service';

import { MembraneService } from './membrane.service';

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
