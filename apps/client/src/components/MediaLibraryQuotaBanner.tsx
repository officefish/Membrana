import React from 'react';

import type { StorageQuota } from '@membrana/media-library-service';

import {
  formatQuotaMb,
  getMediaLibraryStorageMode,
  type MediaLibraryStorageMode,
} from '../lib/mediaLibraryStorageMode';

const MODE_HINT: Record<MediaLibraryStorageMode, string> = {
  'electron-fs': 'Файлы на диске (Electron).',
  'remote-server': 'Файлы на media-server.',
  'browser-limited-fallback':
    'Media-server недоступен. Локальное хранилище ограничено; данные могут пропасть при очистке браузера.',
};

export interface MediaLibraryQuotaBannerProps {
  quota: StorageQuota;
}

export const MediaLibraryQuotaBanner: React.FC<MediaLibraryQuotaBannerProps> = ({
  quota,
}) => {
  const mode = getMediaLibraryStorageMode();
  const isFallback = mode === 'browser-limited-fallback';
  const used = formatQuotaMb(quota.usedBytes);
  const limit = formatQuotaMb(quota.limitBytes);
  const pct = quota.limitBytes > 0 ? (quota.usedBytes / quota.limitBytes) * 100 : 0;

  return (
    <div
      className={`alert text-sm ${isFallback ? 'alert-warning' : 'alert-info'}`}
      role="status"
    >
      <div className="flex w-full flex-col gap-1">
        <span className="font-medium">
          {isFallback ? 'Ограниченное локальное хранилище' : 'Хранилище сэмплов'}
        </span>
        <span className="text-xs opacity-90">{MODE_HINT[mode]}</span>
        <span className="text-xs tabular-nums">
          Использовано {used} / {limit} ({pct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
};
