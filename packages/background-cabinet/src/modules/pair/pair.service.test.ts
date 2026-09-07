import { describe, expect, it, vi } from 'vitest';

import { PairService } from './pair.service';
import { hashAccessKeySecret } from '../membrane/access-key.util';

const now = new Date('2026-08-20T11:00:00.000Z');

const SMART_PARAMS = { thresholdPercent: 70, selection: 'largest_first', protectLabeled: true };

async function buildService(
  opts: {
    existingMediaDeviceId?: string;
    /** #2308: политика мембраны и галочка-привязка. */
    membranePolicy?: { mode: string; params: unknown; binding: boolean };
    devicePolicy?: { bufferPolicy: string; bufferPolicyParams: unknown };
  } = {},
) {
  const accessKey = 'pair-secret';
  const secretHash = await hashAccessKeySecret(accessKey);
  const matchedKey = {
    id: 'paired-key-1',
    nodeId: 'node-1',
    secretHash,
    expiresAt: new Date('2030-08-20T15:00:00.000Z'),
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
      ? { mediaDeviceId: opts.existingMediaDeviceId, ...(opts.devicePolicy ?? {}) }
      : null,
  };
  const prisma = {
    nodeAccessKey: { findMany: vi.fn(async () => [matchedKey]) },
    node: { findUnique: vi.fn(async () => node) },
    membraneBufferPolicy: {
      findUnique: vi.fn(async () => (opts.membranePolicy ? { membraneId: 'membrane-1', ...opts.membranePolicy } : null)),
    },
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

/**
 * Семантика привязки при ПРИВЯЗКЕ узла (#2308, M1, T13/T17): галочка стоит → новый прибор
 * слушает мембрану с первого контекста; снята → прибор получает свою настройку (нет строки →
 * stop). Порча: при стоящей галочке отдать новому прибору stop → красный.
 */
describe('PairService.pair — политика переполнения в контексте (#2308)', () => {
  it('новый прибор при стоящей галочке регистрируется С политикой мембраны', async () => {
    const { accessKey, service, mediaBridge } = await buildService({
      membranePolicy: { mode: 'smart_cleanup', params: SMART_PARAMS, binding: true },
    });
    await service.pair(accessKey);
    const context = mediaBridge.registerDevice.mock.calls[0]![1] as { bufferPolicy?: unknown };
    expect(context.bufferPolicy).toEqual({ mode: 'smart_cleanup', params: SMART_PARAMS });
  });

  it('новый прибор при снятой галочке регистрируется со stop — политика мембраны его не касается', async () => {
    const { accessKey, service, mediaBridge } = await buildService({
      membranePolicy: { mode: 'smart_cleanup', params: SMART_PARAMS, binding: false },
    });
    await service.pair(accessKey);
    const context = mediaBridge.registerDevice.mock.calls[0]![1] as { bufferPolicy?: unknown };
    expect(context.bufferPolicy).toEqual({ mode: 'stop', params: null });
  });

  it('старая мембрана без полей политики → stop (effective(⊥) = stop на дороге привязки)', async () => {
    const { accessKey, service, mediaBridge } = await buildService();
    await service.pair(accessKey);
    const context = mediaBridge.registerDevice.mock.calls[0]![1] as { bufferPolicy?: unknown };
    expect(context.bufferPolicy).toEqual({ mode: 'stop', params: null });
  });

  it('ре-пейринг при снятой галочке возвращает прибору ЕГО настройку, не мембраны', async () => {
    const { accessKey, service, mediaBridge } = await buildService({
      existingMediaDeviceId: 'media-device-existing',
      membranePolicy: { mode: 'stop', params: null, binding: false },
      devicePolicy: { bufferPolicy: 'smart_cleanup', bufferPolicyParams: SMART_PARAMS },
    });
    await service.pair(accessKey);
    expect(mediaBridge.syncMembraneContext).toHaveBeenCalledWith(
      'media-device-existing',
      expect.objectContaining({ bufferPolicy: { mode: 'smart_cleanup', params: SMART_PARAMS } }),
    );
  });

  it('ре-пейринг при стоящей галочке — политика мембраны поверх настройки прибора', async () => {
    const { accessKey, service, mediaBridge } = await buildService({
      existingMediaDeviceId: 'media-device-existing',
      membranePolicy: { mode: 'stop', params: null, binding: true },
      devicePolicy: { bufferPolicy: 'smart_cleanup', bufferPolicyParams: SMART_PARAMS },
    });
    await service.pair(accessKey);
    expect(mediaBridge.syncMembraneContext).toHaveBeenCalledWith(
      'media-device-existing',
      expect.objectContaining({ bufferPolicy: { mode: 'stop', params: null } }),
    );
  });
});
