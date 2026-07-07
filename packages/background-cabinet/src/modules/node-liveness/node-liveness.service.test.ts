import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { NodeLinkStateService } from './node-liveness.service';
import type { NodeRealtimeService } from '../node-realtime/node-realtime.service';
import type { PrismaService } from '../../prisma/prisma.service';

const nodeId = 'node-1';
const userId = 'user-1';
const mediaDeviceId = 'device-1';
const lastSeenAt = new Date('2026-07-04T12:00:00.000Z');

function buildService() {
  const prisma = {
    node: { findUnique: vi.fn() },
  } as unknown as PrismaService;
  const nodeRealtime = {
    isDeviceLive: vi.fn().mockReturnValue(false),
    pingNode: vi.fn().mockResolvedValue({ reachable: true, latencyMs: 12 }),
  } as unknown as NodeRealtimeService;
  const service = new NodeLinkStateService(prisma, nodeRealtime);
  return { service, prisma, nodeRealtime };
}

function mockNode(prisma: PrismaService, device: unknown) {
  vi.mocked(prisma.node.findUnique).mockResolvedValue({
    id: nodeId,
    membraneId: 'm-1',
    membrane: { userId },
    device,
  } as never);
}

describe('NodeLinkStateService.linkState (PCB4)', () => {
  it('paired + live: узел с OPEN-сокетом', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    mockNode(prisma, { mediaDeviceId, pairingStatus: 'paired', lastSeenAt });
    vi.mocked(nodeRealtime.isDeviceLive).mockReturnValue(true);

    const result = await service.linkState(userId, nodeId);

    expect(result).toEqual({ paired: true, live: true, lastSeenAt: lastSeenAt.toISOString() });
    expect(nodeRealtime.isDeviceLive).toHaveBeenCalledWith(mediaDeviceId);
  });

  it('paired но не live: сокета нет → lastSeenAt отдаём для «виден N назад»', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    mockNode(prisma, { mediaDeviceId, pairingStatus: 'paired', lastSeenAt });
    vi.mocked(nodeRealtime.isDeviceLive).mockReturnValue(false);

    const result = await service.linkState(userId, nodeId);

    expect(result).toEqual({ paired: true, live: false, lastSeenAt: lastSeenAt.toISOString() });
  });

  it('revoked: не paired и не live, isDeviceLive не дёргаем', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    mockNode(prisma, { mediaDeviceId, pairingStatus: 'revoked', lastSeenAt });

    const result = await service.linkState(userId, nodeId);

    expect(result).toEqual({ paired: false, live: false, lastSeenAt: lastSeenAt.toISOString() });
    expect(nodeRealtime.isDeviceLive).not.toHaveBeenCalled();
  });

  it('без устройства: paired=false, live=false, lastSeenAt=null', async () => {
    const { service, prisma } = buildService();
    mockNode(prisma, null);

    const result = await service.linkState(userId, nodeId);

    expect(result).toEqual({ paired: false, live: false, lastSeenAt: null });
  });

  it('узел не найден → NotFoundException', async () => {
    const { service, prisma } = buildService();
    vi.mocked(prisma.node.findUnique).mockResolvedValue(null as never);

    await expect(service.linkState(userId, nodeId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('healthPing: сопряжённый узел → делегирует pingNode(mediaDeviceId)', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    mockNode(prisma, { mediaDeviceId, pairingStatus: 'paired', lastSeenAt });

    const result = await service.healthPing(userId, nodeId);

    expect(result).toEqual({ reachable: true, latencyMs: 12 });
    expect(nodeRealtime.pingNode).toHaveBeenCalledWith(mediaDeviceId);
  });

  it('healthPing: без устройства → unreachable, pingNode не дёргаем', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    mockNode(prisma, null);

    const result = await service.healthPing(userId, nodeId);

    expect(result).toEqual({ reachable: false, latencyMs: null });
    expect(nodeRealtime.pingNode).not.toHaveBeenCalled();
  });

  it('чужой узел → ForbiddenException', async () => {
    const { service, prisma } = buildService();
    mockNode(prisma, { mediaDeviceId, pairingStatus: 'paired', lastSeenAt });
    vi.mocked(prisma.node.findUnique).mockResolvedValue({
      id: nodeId,
      membraneId: 'm-1',
      membrane: { userId: 'other-user' },
      device: { mediaDeviceId, pairingStatus: 'paired', lastSeenAt },
    } as never);

    await expect(service.linkState(userId, nodeId)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
