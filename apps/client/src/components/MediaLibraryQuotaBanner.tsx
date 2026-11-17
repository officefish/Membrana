import React from 'react';

import {
  getQuotaLevel,
  resolveMediaLibraryStorageMode,
  type MediaLibraryLoadState,
  type StorageQuota,
} from '@membrana/media-library-service';

import { formatQuotaMb } from '../lib/mediaLibraryStorageMode';

const MODE_HINT = {
  'electron-fs': 'Файлы на диске (Electron).',
  'remote-server': 'Файлы на media-server.',
  'browser-limited-fallback':
    'Media-server недоступен. Локальное хранилище ограничено; данные могут пропасть при очистке браузера.',
} as const;

/** Единственная строка загрузки (#2570, развилка 5): модуль берёт её же; вариации не заводить. */
export const LOADING_HINT = 'Загрузка коллекций…';

const SERVER_DEGRADED_HINT =
  'Связь с media-server нестабильна — квота может быть недоступна, повторите позже.';

const QUOTA_HINT: Record<ReturnType<typeof getQuotaLevel>, string | null> = {
  ok: null,
  warning: 'Квота почти исчерпана — освободите место или подключите media-server.',
  full: 'Квота исчерпана — импорт и запись заблокированы.',
};

export interface MediaLibraryQuotaBannerProps {
  quota: StorageQuota;
  /** Фаза загрузки снимка (#2570); `loading` замыкается ДО режима хранилища. */
  loadState?: MediaLibraryLoadState;
}

export const MediaLibraryQuotaBanner: React.FC<MediaLibraryQuotaBannerProps> = ({
  quota,
  loadState,
}) => {
  if (loadState === 'loading') return <LoadingBanner quota={quota} />;
  const mode = resolveMediaLibraryStorageMode(quota);
  const isFallback = mode === 'browser-limited-fallback';
  const isServerDegraded = quota.backend === 'server' && !quota.serverReachable;
  const quotaLevel = getQuotaLevel(quota);
  const used = formatQuotaMb(quota.usedBytes);
  const limit = formatQuotaMb(quota.limitBytes);
  const pct = quota.limitBytes > 0 ? (quota.usedBytes / quota.limitBytes) * 100 : 0;
  const quotaHint = QUOTA_HINT[quotaLevel];

  const alertClass =
    quotaLevel === 'full'
      ? 'alert-error'
      : quotaLevel === 'warning' || isFallback || isServerDegraded
        ? 'alert-warning'
        : 'alert-info';

  return (
    <div className={`alert text-sm ${alertClass}`} role="status">
      <div className="flex w-full flex-col gap-1">
        <span className="font-medium">
          {isFallback ? 'Ограниченное локальное хранилище' : 'Хранилище сэмплов'}
        </span>
        <span className="text-xs opacity-90">
          {isServerDegraded ? SERVER_DEGRADED_HINT : MODE_HINT[mode]}
        </span>
        {quotaHint ? (
          <span className="text-xs font-medium opacity-95">{quotaHint}</span>
        ) : null}
        <span className="text-xs tabular-nums">
          Использовано {used} / {limit} ({pct.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
};

/**
 * Загрузка (#2570, инвариант I2): ни «Media-server недоступен», ни заглушечных 0.0 / 100.0 MB —
 * начальный снимок ничего не знает о хранилище. Числа — только после реального чтения квоты
 * сервером (`readAt`, промежуточная публикация `refresh()`), пока коллекции ещё грузятся.
 */
const LoadingBanner: React.FC<{ quota: StorageQuota }> = ({ quota }) => {
  const serverRead =
    quota.readAt !== undefined && quota.backend === 'server' && quota.serverReachable;
  return (
    <div className="alert alert-info text-sm" role="status" aria-busy="true">
      <div className="flex w-full flex-col gap-1">
        <span className="font-medium">Хранилище сэмплов</span>
        <span className="text-xs opacity-90">{LOADING_HINT}</span>
        {serverRead ? (
          <span className="text-xs tabular-nums">
            Использовано {formatQuotaMb(quota.usedBytes)} / {formatQuotaMb(quota.limitBytes)}
          </span>
        ) : null}
      </div>
    </div>
  );
};
