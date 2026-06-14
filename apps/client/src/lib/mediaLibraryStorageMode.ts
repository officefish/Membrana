import type { RuntimeStorageMode } from './runtimeStorageMode';
import { getRuntimeStorageMode } from './runtimeStorageMode';

/** Where sample blobs persist — see docs/MEDIA_LIBRARY_ARCHITECTURE.md §4. */
export type MediaLibraryStorageMode =
  | 'electron-fs'
  | 'remote-server'
  | 'browser-limited-fallback';

/**
 * Static hint for UI before media-library hydrates.
 * Runtime mode comes from `resolveMediaLibraryStorageMode(quota)` on the live service.
 */
export function getMediaLibraryStorageModeHint(): MediaLibraryStorageMode {
  const runtime: RuntimeStorageMode = getRuntimeStorageMode();
  if (runtime === 'electron-system-files') {
    return 'electron-fs';
  }
  return 'browser-limited-fallback';
}

export function formatQuotaMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
