import { describe, expect, it, vi } from 'vitest';

import { MembraneService } from './membrane.service';
import type { NodeRealtimeService } from '../node-realtime/node-realtime.service';
import type { PrismaService } from '../../prisma/prisma.service';

const userId = 'user-1';
const keyId = 'key-1';
const membraneId = 'membrane-1';
const mediaDeviceId = 'device-1';

function buildService() {
  const prisma = {
    nodeAccessKey: { findUnique: vi.fn(), update: vi.fn() },
    device: { findFirst: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    session: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
  } as unknown as PrismaService;
  const nodeRealtime = {
    notifySessionInvalidated: vi.fn(),
  } as unknown as NodeRealtimeService;
  const service = new MembraneService(prisma, nodeRealtime);
  return { service, prisma, nodeRealtime };
}

describe('MembraneService.revokeAccessKey — PL2 pairingStatus', () => {
  it('revoke переводит устройство в revoked, сохраняя pairedKeyId, + notify узлу', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    vi.mocked(prisma.nodeAccessKey.findUnique).mockResolvedValue({
      id: keyId,
      revokedAt: null,
      node: { membraneId, membrane: { userId } },
    } as never);
    vi.mocked(prisma.nodeAccessKey.update).mockResolvedValue({
      id: keyId,
      duration: 'hours_4',
      expiresAt: new Date('2026-07-05T00:00:00.000Z'),
      revokedAt: new Date(),
      createdAt: new Date('2026-07-04T00:00:00.000Z'),
    } as never);
    vi.mocked(prisma.device.findFirst).mockResolvedValue({
      lastPairSessionToken: 'tok-1',
      mediaDeviceId,
    } as never);

    await service.revokeAccessKey(userId, keyId);

    // Device помечен revoked; pairedKeyId НЕ трогаем (история для getPairStatus).
    expect(prisma.device.updateMany).toHaveBeenCalledWith({
      where: { pairedKeyId: keyId },
      data: { lastPairSessionToken: null, pairingStatus: 'revoked' },
    });
    // Сессия узла удалена.
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { token: 'tok-1' } });
    // Реальное время: узел уведомлён.
    expect(nodeRealtime.notifySessionInvalidated).toHaveBeenCalledWith(
      mediaDeviceId,
      membraneId,
      'revoked',
    );
  });

  it('deleteAccessKey активного ключа: revoke + отвязка устройства + delete, без 409 (PL3)', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    const activeKey = {
      id: keyId,
      duration: 'hours_4',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // ещё активен
      revokedAt: null,
      createdAt: new Date('2026-07-04T00:00:00.000Z'),
      node: { membraneId, membrane: { userId } },
    };
    // findUnique вызывается в deleteAccessKey и внутри revokeAccessKey.
    vi.mocked(prisma.nodeAccessKey.findUnique).mockResolvedValue(activeKey as never);
    vi.mocked(prisma.nodeAccessKey.update).mockResolvedValue({ ...activeKey, revokedAt: new Date() } as never);
    vi.mocked(prisma.device.findFirst).mockResolvedValue({
      lastPairSessionToken: 'tok-1',
      mediaDeviceId,
    } as never);
    (prisma.nodeAccessKey as unknown as { delete: ReturnType<typeof vi.fn> }).delete = vi
      .fn()
      .mockResolvedValue({ id: keyId } as never);

    const result = await service.deleteAccessKey(userId, keyId);

    // Отзыв случился (notify узлу).
    expect(nodeRealtime.notifySessionInvalidated).toHaveBeenCalledWith(
      mediaDeviceId,
      membraneId,
      'revoked',
    );
    // Отвязка на уровне устройства: pairedKeyId очищен, статус unpaired.
    expect(prisma.device.updateMany).toHaveBeenCalledWith({
      where: { pairedKeyId: keyId },
      data: { pairedKeyId: null, pairingStatus: 'unpaired' },
    });
    // Ключ удалён.
    expect(
      (prisma.nodeAccessKey as unknown as { delete: ReturnType<typeof vi.fn> }).delete,
    ).toHaveBeenCalledWith({ where: { id: keyId } });
    expect(result).toEqual({ deletedKeyId: keyId });
  });

  it('повторный revoke уже отозванного ключа — идемпотентен (без notify)', async () => {
    const { service, prisma, nodeRealtime } = buildService();
    vi.mocked(prisma.nodeAccessKey.findUnique).mockResolvedValue({
      id: keyId,
      duration: 'hours_4',
      expiresAt: new Date('2026-07-05T00:00:00.000Z'),
      revokedAt: new Date('2026-07-04T01:00:00.000Z'),
      createdAt: new Date('2026-07-04T00:00:00.000Z'),
      node: { membraneId, membrane: { userId } },
    } as never);

    await service.revokeAccessKey(userId, keyId);

    expect(prisma.device.updateMany).not.toHaveBeenCalled();
    expect(nodeRealtime.notifySessionInvalidated).not.toHaveBeenCalled();
  });
});
