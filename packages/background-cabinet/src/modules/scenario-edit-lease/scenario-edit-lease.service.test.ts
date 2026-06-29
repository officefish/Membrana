import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ScenarioEditLeaseService } from './scenario-edit-lease.service';
import type { NodeRealtimeService } from '../node-realtime/node-realtime.service';
import type { PrismaService } from '../../prisma/prisma.service';

const nodeId = 'node-1';
const membraneId = 'membrane-1';
const mediaDeviceId = 'device-1';
const sessionId = 'session-1';
const userId = 'user-1';

function buildService() {
  const prisma = {
    node: { findUnique: vi.fn() },
    nodeScenarioEditLease: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as PrismaService;
  const nodeRealtime = {
    broadcastBoardEnvelope: vi.fn(),
  } as unknown as NodeRealtimeService;
  const service = new ScenarioEditLeaseService(prisma, nodeRealtime);
  return { service, prisma, nodeRealtime };
}

function mockOwnedNode(prisma: PrismaService) {
  vi.mocked(prisma.node.findUnique).mockResolvedValue({
    id: nodeId,
    membraneId,
    membrane: { userId },
    device: { mediaDeviceId },
  } as never);
}

describe('ScenarioEditLeaseService', () => {
  it('acquire creates lease and broadcasts board.edit-lease', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    mockOwnedNode(prisma);
    vi.mocked(prisma.nodeScenarioEditLease.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.nodeScenarioEditLease.upsert).mockResolvedValue({
      mediaDeviceId,
      sessionId,
      revision: 2,
      expiresAt: new Date('2026-06-26T11:00:00.000Z'),
    } as never);

    const result = await service.acquire(userId, sessionId, nodeId, 2);

    expect(result.lease.holder).toBe('cabinet');
    expect(result.lease.revision).toBe(2);
    expect(nodeRealtime.broadcastBoardEnvelope).toHaveBeenCalledWith(
      membraneId,
      mediaDeviceId,
      expect.objectContaining({
        channel: 'board',
        type: 'board.edit-lease',
        payload: expect.objectContaining({
          deviceId: mediaDeviceId,
          holder: 'cabinet',
          sessionId,
          revision: 2,
        }),
      }),
    );
  });

  it('acquire rejects when another session holds active lease', async () => {
    const { service, prisma } = buildService();
    mockOwnedNode(prisma);
    vi.mocked(prisma.nodeScenarioEditLease.findUnique).mockResolvedValue({
      id: 'lease-1',
      sessionId: 'other-session',
      expiresAt: new Date(Date.now() + 60_000),
    } as never);

    await expect(service.acquire(userId, sessionId, nodeId, 0)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('release broadcasts holder none', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    mockOwnedNode(prisma);
    vi.mocked(prisma.nodeScenarioEditLease.findUnique).mockResolvedValue({
      id: 'lease-1',
      sessionId,
      revision: 4,
    } as never);
    vi.mocked(prisma.nodeScenarioEditLease.delete).mockResolvedValue({} as never);

    const result = await service.release(userId, sessionId, nodeId);

    expect(result.lease.holder).toBe('none');
    expect(nodeRealtime.broadcastBoardEnvelope).toHaveBeenCalledWith(
      membraneId,
      mediaDeviceId,
      expect.objectContaining({
        payload: expect.objectContaining({ holder: 'none', revision: 4 }),
      }),
    );
  });
});
