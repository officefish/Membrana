import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import {
  CAPTURE_PREEMPTION_FADE_OUT_MS,
  DEVICE_CAPTURE_TTL_MS,
} from '../../domain/device-capture';
import { DeviceCaptureRegistry } from '../node-realtime/device-capture.registry';
import { DeviceCaptureService } from './device-capture.service';
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
    nodeDeviceCapture: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as PrismaService;
  const nodeRealtime = {
    broadcastBoardEnvelope: vi.fn(),
    sendToNode: vi.fn(),
  } as unknown as NodeRealtimeService;
  const registry = new DeviceCaptureRegistry();
  const service = new DeviceCaptureService(prisma, nodeRealtime, registry);
  return { service, prisma, nodeRealtime, registry };
}

function mockOwnedNode(prisma: PrismaService) {
  vi.mocked(prisma.node.findUnique).mockResolvedValue({
    id: nodeId,
    membraneId,
    membrane: { userId },
    device: { mediaDeviceId },
  } as never);
}

function captureRow(overrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: 'cap-1',
    membraneId,
    nodeId,
    mediaDeviceId,
    sessionId,
    mode: 'soft',
    acquiredAt: new Date(now),
    expiresAt: new Date(now + DEVICE_CAPTURE_TTL_MS),
    ...overrides,
  };
}

describe('DeviceCaptureService.forceReleaseByNode (PL4)', () => {
  it('удаляет захват, чистит registry и broadcast release без проверки сессии', async () => {
    const { service, prisma, nodeRealtime, registry } = buildService();
    const row = captureRow();
    registry.set(mediaDeviceId, {
      membraneId,
      nodeId,
      sessionId,
      mode: 'soft',
      expiresAt: row.expiresAt,
    });
    vi.mocked(prisma.nodeDeviceCapture.findUnique).mockResolvedValue(row as never);

    await service.forceReleaseByNode(nodeId);

    expect(prisma.nodeDeviceCapture.delete).toHaveBeenCalledWith({ where: { id: 'cap-1' } });
    expect(registry.get(mediaDeviceId)).toBeNull();
    expect(nodeRealtime.broadcastBoardEnvelope).toHaveBeenCalled();
  });

  it('идемпотентно: захвата нет — ничего не делает', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    vi.mocked(prisma.nodeDeviceCapture.findUnique).mockResolvedValue(null);

    await service.forceReleaseByNode(nodeId);

    expect(prisma.nodeDeviceCapture.delete).not.toHaveBeenCalled();
    expect(nodeRealtime.broadcastBoardEnvelope).not.toHaveBeenCalled();
  });
});

describe('DeviceCaptureService', () => {
  it('capture persists, fills registry, broadcasts board.capture and sends pre-emption stop', async () => {
    const { service, prisma, nodeRealtime, registry } = buildService();
    mockOwnedNode(prisma);
    vi.mocked(prisma.nodeDeviceCapture.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.nodeDeviceCapture.upsert).mockResolvedValue(captureRow({ mode: 'hard' }) as never);

    const result = await service.capture(userId, sessionId, nodeId, 'hard');

    expect(result.capture.mode).toBe('hard');
    expect(result.capture.deviceId).toBe(mediaDeviceId);
    expect(registry.get(mediaDeviceId)?.mode).toBe('hard');
    expect(nodeRealtime.broadcastBoardEnvelope).toHaveBeenCalledWith(
      membraneId,
      mediaDeviceId,
      expect.objectContaining({
        channel: 'board',
        type: 'board.capture',
        payload: expect.objectContaining({ deviceId: mediaDeviceId, mode: 'hard', sessionId }),
      }),
    );
    // Вытеснение (канон §3.1): graceful fade-out, не hard-cut.
    expect(nodeRealtime.sendToNode).toHaveBeenCalledWith(
      mediaDeviceId,
      expect.objectContaining({
        channel: 'runtime',
        type: 'runtime.command',
        payload: expect.objectContaining({
          action: 'stop',
          fadeOutMs: CAPTURE_PREEMPTION_FADE_OUT_MS,
        }),
      }),
    );
  });

  it('capture rejects when another session holds active capture', async () => {
    const { service, prisma } = buildService();
    mockOwnedNode(prisma);
    vi.mocked(prisma.nodeDeviceCapture.findUnique).mockResolvedValue(
      captureRow({ sessionId: 'other-session' }) as never,
    );

    await expect(service.capture(userId, sessionId, nodeId, 'soft')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('release deletes capture, clears registry, broadcasts board.release and does NOT stop scenario', async () => {
    const { service, prisma, nodeRealtime, registry } = buildService();
    mockOwnedNode(prisma);
    registry.set(mediaDeviceId, {
      membraneId,
      nodeId,
      sessionId,
      mode: 'soft',
      expiresAt: new Date(Date.now() + DEVICE_CAPTURE_TTL_MS),
    });
    vi.mocked(prisma.nodeDeviceCapture.findUnique).mockResolvedValue(captureRow() as never);

    const result = await service.release(userId, sessionId, nodeId);

    expect(result.released).toBe(true);
    expect(registry.get(mediaDeviceId)).toBeNull();
    expect(nodeRealtime.broadcastBoardEnvelope).toHaveBeenCalledWith(
      membraneId,
      mediaDeviceId,
      expect.objectContaining({
        type: 'board.release',
        payload: expect.objectContaining({ reason: 'operator', sessionId }),
      }),
    );
    // Release = отпускание управления, НЕ стоп (канон §3).
    expect(nodeRealtime.sendToNode).not.toHaveBeenCalled();
  });

  it('release rejects foreign session capture', async () => {
    const { service, prisma } = buildService();
    mockOwnedNode(prisma);
    vi.mocked(prisma.nodeDeviceCapture.findUnique).mockResolvedValue(
      captureRow({ sessionId: 'other-session' }) as never,
    );

    await expect(service.release(userId, sessionId, nodeId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('heartbeatSweep renews live captures with board.heartbeat broadcast', async () => {
    const { service, prisma, nodeRealtime, registry } = buildService();
    const now = new Date('2026-07-02T10:00:00.000Z');
    vi.mocked(prisma.nodeDeviceCapture.findMany).mockResolvedValue([
      captureRow({ expiresAt: new Date(now.getTime() + 60_000) }),
    ] as never);
    vi.mocked(prisma.nodeDeviceCapture.update).mockResolvedValue({} as never);

    await service.heartbeatSweep(now);

    expect(prisma.nodeDeviceCapture.update).toHaveBeenCalledWith({
      where: { id: 'cap-1' },
      data: { expiresAt: new Date(now.getTime() + DEVICE_CAPTURE_TTL_MS) },
    });
    expect(registry.get(mediaDeviceId, now)).not.toBeNull();
    expect(nodeRealtime.broadcastBoardEnvelope).toHaveBeenCalledWith(
      membraneId,
      mediaDeviceId,
      expect.objectContaining({
        type: 'board.heartbeat',
        payload: expect.objectContaining({
          deviceId: mediaDeviceId,
          sessionId,
          expiresAt: new Date(now.getTime() + DEVICE_CAPTURE_TTL_MS).toISOString(),
        }),
      }),
    );
  });

  it('heartbeatSweep releases expired captures with reason ttl-expired', async () => {
    const { service, prisma, nodeRealtime, registry } = buildService();
    const now = new Date('2026-07-02T10:00:00.000Z');
    registry.set(mediaDeviceId, {
      membraneId,
      nodeId,
      sessionId,
      mode: 'soft',
      expiresAt: new Date(now.getTime() - 1_000),
    });
    vi.mocked(prisma.nodeDeviceCapture.findMany).mockResolvedValue([
      captureRow({ expiresAt: new Date(now.getTime() - 1_000) }),
    ] as never);
    vi.mocked(prisma.nodeDeviceCapture.delete).mockResolvedValue({} as never);

    await service.heartbeatSweep(now);

    expect(prisma.nodeDeviceCapture.delete).toHaveBeenCalledWith({ where: { id: 'cap-1' } });
    expect(registry.get(mediaDeviceId, now)).toBeNull();
    expect(nodeRealtime.broadcastBoardEnvelope).toHaveBeenCalledWith(
      membraneId,
      mediaDeviceId,
      expect.objectContaining({
        type: 'board.release',
        payload: expect.objectContaining({ reason: 'ttl-expired', sessionId: null }),
      }),
    );
  });
});
