import type { Device } from '../../prisma/client';
import type { AppConfig } from '../../config/env.schema';

export interface ResolvedDeviceLimits {
  userStorageQuotaBytes: number;
  bufferQuotaBytes: number;
  datasetCatalogId: string;
}

/** Coerce stored BigInt quota to a safe JS integer for API responses. */
export function bigintToSafeInt(value: bigint | null | undefined, fallback: number): number {
  if (value == null) return fallback;
  const asNumber = Number(value);
  return Number.isSafeInteger(asNumber) && asNumber > 0 ? asNumber : fallback;
}

/** Resolve per-device tariff limits with env defaults for legacy devices. */
export function resolveDeviceLimits(device: Device, config: AppConfig): ResolvedDeviceLimits {
  return {
    userStorageQuotaBytes: bigintToSafeInt(
      device.userStorageQuotaBytes,
      config.MEDIA_USER_STORAGE_QUOTA_BYTES_PER_DEVICE,
    ),
    bufferQuotaBytes: bigintToSafeInt(
      device.bufferQuotaBytes,
      config.MEDIA_BUFFER_QUOTA_BYTES_PER_DEVICE,
    ),
    datasetCatalogId: device.datasetCatalogId ?? config.MEDIA_DEFAULT_DATASET_CATALOG_ID,
  };
}
