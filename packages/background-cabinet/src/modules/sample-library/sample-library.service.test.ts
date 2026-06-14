import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import type { PrismaService } from '../../prisma/prisma.service';
import type { MediaBridgeService } from '../pair/media-bridge.service';
import { TARIFF_DATASET_COLLECTION_ID } from './sample-library.constants';
import { SampleLibraryService } from './sample-library.service';

const CONFIG: AppConfig = {
  PORT: 3020,
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  API_INTERNAL_TOKEN: 'test-token',
  DATABASE_URL: 'postgresql://test',
  SESSION_TTL_HOURS: 168,
  CABINET_CORS_ORIGINS: ['http://localhost:5174'],
  CLIENT_CORS_ORIGINS: ['http://localhost:5173'],
  MEDIA_API_URL: 'http://localhost:3010',
  MEDIA_PUBLIC_API_URL: 'http://localhost:3010',
  MEDIA_API_TOKEN: 'media-token',
  ALLOW_REGISTRATION: true,
};

function makeService(overrides?: {
  prisma?: Partial<PrismaService>;
  mediaBridge?: Partial<MediaBridgeService>;
}) {
  const prisma = {
    membrane: {
      findUnique: vi.fn(),
    },
    node: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    ...overrides?.prisma,
  } as unknown as PrismaService;

  const mediaBridge = {
    getQuota: vi.fn(),
    listSamples: vi.fn(),
    ...overrides?.mediaBridge,
  } as unknown as MediaBridgeService;

  const service = new SampleLibraryService(prisma, mediaBridge, CONFIG);
  return { service, prisma, mediaBridge };
}

describe('SampleLibraryService', () => {
  it('denies foreign membrane', async () => {
    const { service, prisma } = makeService();
    vi.mocked(prisma.membrane.findUnique).mockResolvedValue({
      id: 'mem-1',
      userId: 'other-user',
      tariffId: 'free-v1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    await expect(service.listNodes('user-1', 'mem-1')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists nodes with per-device quota (N-ready)', async () => {
    const { service, prisma, mediaBridge } = makeService();
    vi.mocked(prisma.membrane.findUnique).mockResolvedValue({
      id: 'mem-1',
      userId: 'user-1',
      tariffId: 'free-v1',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(prisma.node.findMany).mockResolvedValue([
      {
        id: 'node-a',
        label: 'Field A',
        membraneId: 'mem-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: {
          mediaDeviceId: 'dev-a',
          pairedAt: new Date('2026-06-01T00:00:00.000Z'),
          lastSeenAt: new Date('2026-06-14T00:00:00.000Z'),
        },
      },
      {
        id: 'node-b',
        label: 'Field B',
        membraneId: 'mem-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        device: {
          mediaDeviceId: 'dev-b',
          pairedAt: new Date('2026-06-02T00:00:00.000Z'),
          lastSeenAt: new Date('2026-06-14T00:00:00.000Z'),
        },
      },
    ] as never);

    vi.mocked(mediaBridge.getQuota)
      .mockResolvedValueOnce({
        userStorage: { usedBytes: 100, limitBytes: 1_000, backend: 'server' },
        buffer: { usedBytes: 10, limitBytes: 500, backend: 'server' },
        dataset: { catalogId: 'free-v1-catalog', sampleCount: 120 },
      })
      .mockResolvedValueOnce({
        userStorage: { usedBytes: 200, limitBytes: 1_000, backend: 'server' },
        buffer: { usedBytes: 40, limitBytes: 500, backend: 'server' },
        dataset: { catalogId: 'free-v1-catalog', sampleCount: 120 },
      });

    const { nodes } = await service.listNodes('user-1', 'mem-1');
    expect(nodes).toHaveLength(2);
    expect(nodes[0]?.deviceId).toBe('dev-a');
    expect(nodes[1]?.quota?.buffer.usedBytes).toBe(40);
    expect(nodes[0]?.quota?.buffer.usedBytes).not.toBe(nodes[1]?.quota?.buffer.usedBytes);
  });

  it('returns membrane catalog once from representative device', async () => {
    const { service, prisma, mediaBridge } = makeService();
    vi.mocked(prisma.membrane.findUnique).mockResolvedValue({
      id: 'mem-1',
      userId: 'user-1',
      tariffId: 'free-v1',
      createdAt: new Date(),
      updatedAt: new Date(),
      tariff: {
        id: 'free-v1',
        name: 'Free',
        datasetCatalogId: 'free-v1-catalog',
        userStorageQuotaBytes: 1n,
        bufferQuotaBytes: 1n,
        maxActiveKeysPerNode: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as never);
    vi.mocked(prisma.node.findFirst).mockResolvedValue({
      id: 'node-a',
      device: { mediaDeviceId: 'dev-a' },
    } as never);
    vi.mocked(mediaBridge.listSamples).mockResolvedValue([
      {
        id: 's1',
        collectionId: TARIFF_DATASET_COLLECTION_ID,
        title: 'drone-1',
        class: 'drone',
        label: 'drone',
        source: 'catalog',
        durationSec: 5,
        sampleRate: 48_000,
        channels: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        storageRef: 's1.wav',
        sizeBytes: 1000,
      },
    ]);

    const catalog = await service.getCatalog('user-1', 'mem-1');
    expect(catalog.catalogId).toBe('free-v1-catalog');
    expect(catalog.sourceDeviceId).toBe('dev-a');
    expect(catalog.sampleCount).toBe(1);
    expect(mediaBridge.listSamples).toHaveBeenCalledWith('dev-a', TARIFF_DATASET_COLLECTION_ID);
    expect(mediaBridge.listSamples).not.toHaveBeenCalledWith('dev-b', expect.anything());
  });

  it('returns media session scoped to paired devices', async () => {
    const { service, prisma } = makeService();
    vi.mocked(prisma.membrane.findUnique).mockResolvedValue({
      id: 'mem-1',
      userId: 'user-1',
      tariff: { datasetCatalogId: 'free-v1-catalog' },
      nodes: [
        { id: 'node-a', label: 'A', device: { mediaDeviceId: 'dev-a' } },
        { id: 'node-b', label: 'B', device: null },
      ],
    } as never);

    const session = await service.getMediaSession('user-1');
    expect(session.membraneId).toBe('mem-1');
    expect(session.mediaApiUrl).toBe('http://localhost:3010');
    expect(session.mediaToken).toBe('media-token');
    expect(session.devices).toEqual([
      { nodeId: 'node-a', nodeLabel: 'A', deviceId: 'dev-a' },
    ]);
  });

  it('throws when membrane missing for session', async () => {
    const { service, prisma } = makeService();
    vi.mocked(prisma.membrane.findUnique).mockResolvedValue(null);

    await expect(service.getMediaSession('user-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
