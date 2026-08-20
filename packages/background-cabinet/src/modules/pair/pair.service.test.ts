import { describe, expect, it, vi } from 'vitest';

import { PairService } from './pair.service';
import { hashAccessKeySecret } from '../membrane/access-key.util';

const now = new Date('2026-08-20T11:00:00.000Z');

async function buildService(opts: { existingMediaDeviceId?: string } = {}) {
  const accessKey = 'pair-secret';
  const secretHash = await hashAccessKeySecret(accessKey);
  const matchedKey = {
    id: 'paired-key-1',
    nodeId: 'node-1',
    secretHash,
    expiresAt: new Date('2026-08-20T15:00:00.000Z'),
    revokedAt: null,
  };
  const node = {
    id: 'node-1',
    label: 'Firebat',
    membrane: {
      id: 'membrane-1',
      user: { id: 'user-1', login: 'captain', role: 'user' },
      tariff: {
        id: 'free-v1',
        userStorageQuotaBytes: 1024n,
        bufferQuotaBytes: 2048n,
        datasetCatalogId: 'free-v1-catalog',
        maxUserWorkspaces: 3,
      },
    },
    device: opts.existingMediaDeviceId
      ? { mediaDeviceId: opts.existingMediaDeviceId }
      : null,
  };
  const prisma = {
    nodeAccessKey: { findMany: vi.fn(async () => [matchedKey]) },
    node: { findUnique: vi.fn(async () => node) },
    device: {
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
  };
  const authService = {
    createSessionForUserWithExpiry: vi.fn(async () => ({
      token: 'session-token',
      expiresAt: new Date('2026-08-20T12:00:00.000Z'),
    })),
  };
  const mediaBridge = {
    registerDevice: vi.fn(async () => ({
      id: 'media-device-1',
      name: 'Firebat',
      kind: 'other',
      createdAt: now.toISOString(),
      clientKey: {
        keyId: 'client-key-1',
        raw: 'client-token-new',
        createdAt: now.toISOString(),
        rotatedFrom: null,
      },
    })),
    issueClientKey: vi.fn(async () => ({
      keyId: 'client-key-2',
      raw: 'client-token-rotated',
      createdAt: now.toISOString(),
      rotatedFrom: 'client-key-1',
    })),
    ensureReservedCollections: vi.fn(async () => undefined),
    syncMembraneContext: vi.fn(async () => undefined),
  };
  const config = {
    MEDIA_API_TOKEN: 'service-token',
    MEDIA_PUBLIC_API_URL: 'http://media.local',
    SESSION_TTL_HOURS: 4,
  };
  const service = new PairService(
    prisma as never,
    authService as never,
    mediaBridge as never,
    config as never,
  );
  return { accessKey, service, prisma, mediaBridge };
}

describe('PairService.pair — ADR-0028 mediaToken', () => {
  it('новый media device возвращает client key вместо служебного MEDIA_API_TOKEN', async () => {
    const { accessKey, service, mediaBridge } = await buildService();

    const res = await service.pair(accessKey);

    expect(res.mediaToken).toBe('client-token-new');
    expect(res.mediaToken).not.toBe('service-token');
    expect(res.deviceId).toBe('media-device-1');
    expect(mediaBridge.registerDevice).toHaveBeenCalled();
    expect(mediaBridge.issueClientKey).not.toHaveBeenCalled();
  });

  it('re-pair existing media device rotates client key and returns the new raw key', async () => {
    const { accessKey, service, mediaBridge } = await buildService({
      existingMediaDeviceId: 'media-device-existing',
    });

    const res = await service.pair(accessKey, 'Firebat desktop');

    expect(res.deviceId).toBe('media-device-existing');
    expect(res.mediaToken).toBe('client-token-rotated');
    expect(mediaBridge.issueClientKey).toHaveBeenCalledWith('media-device-existing');
    expect(mediaBridge.registerDevice).not.toHaveBeenCalled();
  });
});
