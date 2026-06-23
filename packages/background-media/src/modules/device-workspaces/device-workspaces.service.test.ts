import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceWorkspacesService } from './device-workspaces.service';

const mockConfig = {
  MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1_073_741_824,
  MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 1_073_741_824,
  MEDIA_DEFAULT_DATASET_CATALOG_ID: 'free-v1-catalog',
  MEDIA_DEFAULT_MAX_USER_WORKSPACES: 3,
} as const;

describe('DeviceWorkspacesService', () => {
  const prisma = {
    device: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    deviceWorkspace: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    deviceScenario: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  let service: DeviceWorkspacesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DeviceWorkspacesService(prisma as never, mockConfig as never);
  });

  it('lists workspaces with active id and quota snapshot', async () => {
    prisma.deviceWorkspace.count.mockResolvedValue(1);
    prisma.device.findUnique.mockResolvedValue({
      id: 'dev-1',
      activeWorkspaceId: 'ws-1',
      maxUserWorkspaces: 3,
      userStorageQuotaBytes: null,
      bufferQuotaBytes: null,
      datasetCatalogId: null,
    });
    prisma.deviceWorkspace.findMany.mockResolvedValue([
      {
        workspaceId: 'ws-1',
        title: 'A',
        updatedAt: new Date('2026-06-23T10:00:00.000Z'),
      },
    ]);

    const result = await service.listWorkspaces('dev-1');

    expect(result).toEqual({
      activeWorkspaceId: 'ws-1',
      workspaces: [
        {
          workspaceId: 'ws-1',
          title: 'A',
          updatedAt: '2026-06-23T10:00:00.000Z',
        },
      ],
      userWorkspacesQuota: { used: 1, limit: 3 },
    });
  });

  it('migrates legacy device-scenario into first workspace', async () => {
    prisma.deviceWorkspace.count.mockResolvedValue(0);
    prisma.deviceScenario.findUnique.mockResolvedValue({
      payload: {
        kind: 'device-scenario',
        version: 1,
        deviceKind: 'microphone',
        signalGraph: { nodes: [], edges: [] },
        scenario: { nodes: [], edges: [] },
        meta: { workspaceId: 'legacy-ws', title: 'Legacy' },
      },
      updatedAt: new Date('2026-06-22T10:00:00.000Z'),
    });
    prisma.$transaction.mockResolvedValue([]);
    prisma.device.findUnique.mockResolvedValue({
      id: 'dev-1',
      activeWorkspaceId: 'legacy-ws',
      maxUserWorkspaces: null,
      userStorageQuotaBytes: null,
      bufferQuotaBytes: null,
      datasetCatalogId: null,
    });
    prisma.deviceWorkspace.findMany.mockResolvedValue([
      {
        workspaceId: 'legacy-ws',
        title: 'Legacy',
        updatedAt: new Date('2026-06-22T10:00:00.000Z'),
      },
    ]);

    await service.listWorkspaces('dev-1');

    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it('putWorkspace throws ConflictException when expectedUpdatedAt is stale', async () => {
    const document = {
      kind: 'device-scenario',
      version: 1,
      deviceKind: 'microphone',
      signalGraph: { nodes: [], edges: [] },
      scenario: { nodes: [], edges: [] },
      meta: { title: 'Saved' },
    };
    prisma.deviceWorkspace.findUnique.mockResolvedValue({
      payload: document,
      updatedAt: new Date('2026-06-23T12:00:00.000Z'),
    });

    await expect(
      service.putWorkspace('dev-1', 'ws-1', document, {
        expectedUpdatedAt: '2026-06-23T11:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.deviceWorkspace.upsert).not.toHaveBeenCalled();
  });

  it('putWorkspace allows create when workspace row is missing', async () => {
    const document = {
      kind: 'device-scenario',
      version: 1,
      deviceKind: 'microphone',
      signalGraph: { nodes: [], edges: [] },
      scenario: { nodes: [], edges: [] },
      meta: { title: 'New' },
    };
    prisma.deviceWorkspace.findUnique.mockResolvedValue(null);
    prisma.device.findUnique.mockResolvedValue({
      id: 'dev-1',
      maxUserWorkspaces: 3,
      userStorageQuotaBytes: null,
      bufferQuotaBytes: null,
      datasetCatalogId: null,
    });
    prisma.deviceWorkspace.count.mockResolvedValue(0);
    prisma.deviceWorkspace.upsert.mockResolvedValue({
      payload: document,
      updatedAt: new Date('2026-06-23T12:00:00.000Z'),
    });
    prisma.device.findUnique.mockResolvedValue({ activeWorkspaceId: null });

    await expect(
      service.putWorkspace('dev-1', 'ws-new', document, {
        expectedUpdatedAt: '2026-06-23T11:00:00.000Z',
      }),
    ).resolves.toMatchObject({ updatedAt: '2026-06-23T12:00:00.000Z' });
  });

  it('putWorkspace throws ForbiddenException when workspace quota exceeded', async () => {
    const document = {
      kind: 'device-scenario',
      version: 1,
      deviceKind: 'microphone',
      signalGraph: { nodes: [], edges: [] },
      scenario: { nodes: [], edges: [] },
      meta: { title: 'Fourth' },
    };
    prisma.deviceWorkspace.findUnique.mockResolvedValue(null);
    prisma.device.findUnique.mockResolvedValue({
      id: 'dev-1',
      maxUserWorkspaces: 3,
      userStorageQuotaBytes: null,
      bufferQuotaBytes: null,
      datasetCatalogId: null,
    });
    prisma.deviceWorkspace.count.mockResolvedValue(3);

    await expect(service.putWorkspace('dev-1', 'ws-new', document)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.deviceWorkspace.upsert).not.toHaveBeenCalled();
  });

  it('putWorkspace syncs legacy device-scenario when workspace is active', async () => {
    const document = {
      kind: 'device-scenario',
      version: 1,
      deviceKind: 'microphone',
      signalGraph: { nodes: [], edges: [] },
      scenario: { nodes: [], edges: [] },
      meta: { title: 'Saved' },
    };
    prisma.deviceWorkspace.upsert.mockResolvedValue({
      payload: document,
      updatedAt: new Date('2026-06-23T12:00:00.000Z'),
    });
    prisma.deviceWorkspace.findUnique.mockResolvedValue({
      payload: document,
      updatedAt: new Date('2026-06-23T12:00:00.000Z'),
    });
    prisma.device.findUnique.mockResolvedValue({ activeWorkspaceId: 'ws-1' });
    prisma.deviceScenario.upsert.mockResolvedValue({});

    const result = await service.putWorkspace('dev-1', 'ws-1', document);

    expect(prisma.deviceScenario.upsert).toHaveBeenCalledOnce();
    expect(result.updatedAt).toBe('2026-06-23T12:00:00.000Z');
  });

  it('setActiveWorkspace throws when workspace missing', async () => {
    prisma.deviceWorkspace.findUnique.mockResolvedValue(null);
    await expect(service.setActiveWorkspace('dev-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
