import type { RuntimeStorageMode } from './runtimeStorageMode';
import { getRuntimeStorageMode } from './runtimeStorageMode';

/** Where sample blobs persist — see docs/MEDIA_LIBRARY_ARCHITECTURE.md §4. */
export type MediaLibraryStorageMode =
  | 'electron-fs'
  | 'remote-server'
  | 'browser-limited-fallback';

export function getMediaLibraryStorageMode(): MediaLibraryStorageMode {
  const runtime: RuntimeStorageMode = getRuntimeStorageMode();
  if (runtime === 'electron-system-files') {
    return 'electron-fs';
  }
  // background-media ping — фаза A5; пока fallback
  return 'browser-limited-fallback';
}

export function formatQuotaMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
