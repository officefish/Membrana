import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DeviceWorkspacesService } from './device-workspaces.service';

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
    service = new DeviceWorkspacesService(prisma as never);
  });

  it('lists workspaces with active id', async () => {
    prisma.deviceWorkspace.count.mockResolvedValue(1);
    prisma.device.findUnique.mockResolvedValue({ activeWorkspaceId: 'ws-1' });
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
    prisma.device.findUnique.mockResolvedValue({ activeWorkspaceId: 'legacy-ws' });
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
