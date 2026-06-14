import { describe, expect, it } from 'vitest';
import { bigintToSafeInt, resolveDeviceLimits } from './device-limits';
import type { Device } from '../../prisma/client';

const baseDevice: Device = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'test',
  kind: 'other',
  membraneId: '00000000-0000-4000-8000-000000000002',
  userStorageQuotaBytes: null,
  bufferQuotaBytes: null,
  datasetCatalogId: null,
  createdAt: new Date('2026-01-01'),
};

const config = {
  MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE: 1_000,
  MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE: 2_000,
  MEDIA_DEFAULT_DATASET_CATALOG_ID: 'env-catalog',
} as const;

describe('device-limits', () => {
  it('bigintToSafeInt returns fallback for null', () => {
    expect(bigintToSafeInt(null, 99)).toBe(99);
  });

  it('bigintToSafeInt converts valid BigInt', () => {
    expect(bigintToSafeInt(BigInt(5_000), 99)).toBe(5_000);
  });

  it('resolveDeviceLimits uses device tariff when set', () => {
    const limits = resolveDeviceLimits(
      {
        ...baseDevice,
        userStorageQuotaBytes: BigInt(10_000),
        bufferQuotaBytes: BigInt(20_000),
        datasetCatalogId: 'pro-catalog',
      },
      config as never,
    );
    expect(limits).toEqual({
      userStorageQuotaBytes: 10_000,
      bufferQuotaBytes: 20_000,
      datasetCatalogId: 'pro-catalog',
    });
  });

  it('resolveDeviceLimits falls back to env for legacy devices', () => {
    const limits = resolveDeviceLimits(baseDevice, config as never);
    expect(limits).toEqual({
      userStorageQuotaBytes: 1_000,
      bufferQuotaBytes: 2_000,
      datasetCatalogId: 'env-catalog',
    });
  });
});
