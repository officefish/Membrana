import type { StorageQuota } from './types.js';

/** Warning threshold — see docs/MEDIA_LIBRARY_ARCHITECTURE.md §4.3 */
export const QUOTA_WARNING_RATIO = 0.9;

export type QuotaLevel = 'ok' | 'warning' | 'full';

export type MediaLibraryStorageMode =
  | 'electron-fs'
  | 'remote-server'
  | 'browser-limited-fallback';

export function resolveMediaLibraryStorageMode(quota: StorageQuota): MediaLibraryStorageMode {
  if (quota.backend === 'electron-fs') return 'electron-fs';
  if (quota.backend === 'server' && quota.serverReachable) return 'remote-server';
  return 'browser-limited-fallback';
}

export function getQuotaLevel(quota: StorageQuota): QuotaLevel {
  if (quota.limitBytes <= 0) return 'ok';
  if (quota.usedBytes >= quota.limitBytes) return 'full';
  if (quota.usedBytes >= quota.limitBytes * QUOTA_WARNING_RATIO) return 'warning';
  return 'ok';
}

export function isQuotaFull(quota: StorageQuota): boolean {
  return getQuotaLevel(quota) === 'full';
}

export function isQuotaWarning(quota: StorageQuota): boolean {
  const level = getQuotaLevel(quota);
  return level === 'warning' || level === 'full';
}
