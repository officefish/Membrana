import {
  getQuotaLevel,
  type StorageQuota,
} from '@membrana/media-library-service';

import { formatQuotaMb } from '@/lib/formatQuotaMb';

const QUOTA_HINT: Record<ReturnType<typeof getQuotaLevel>, string | null> = {
  ok: null,
  warning: 'Квота почти исчерпана — освободите место на узле.',
  full: 'Квота исчерпана — импорт и запись заблокированы.',
};

export interface MediaLibraryQuotaBannerProps {
  quota: StorageQuota;
  nodeLabel?: string;
}

export function MediaLibraryQuotaBanner({ quota, nodeLabel }: MediaLibraryQuotaBannerProps) {
  const quotaLevel = getQuotaLevel(quota);
  const used = formatQuotaMb(quota.usedBytes);
  const limit = formatQuotaMb(quota.limitBytes);
  const pct = quota.limitBytes > 0 ? (quota.usedBytes / quota.limitBytes) * 100 : 0;
  const quotaHint = QUOTA_HINT[quotaLevel];

  const alertClass =
    quotaLevel === 'full'
      ? 'alert-error'
      : quotaLevel === 'warning'
        ? 'alert-warning'
        : 'alert-info';

  return (
    <div className={`alert text-sm ${alertClass}`} role="status">
      <div className="flex w-full flex-col gap-1">
        <span className="font-medium">
          Хранилище узла{nodeLabel ? `: ${nodeLabel}` : ''}
        </span>
        <span className="text-xs opacity-90">Файлы на media-server (удалённый узел).</span>
        {quotaHint ? (
          <span className="text-xs font-medium opacity-95">{quotaHint}</span>
        ) : null}
        <span className="text-xs tabular-nums">
          Использовано {used} / {limit} ({pct.toFixed(0)}%)
        </span>
        {quota.bufferLimitBytes > 0 ? (
          <span className="text-xs tabular-nums opacity-80">
            Буфер: {formatQuotaMb(quota.bufferUsedBytes)} /{' '}
            {formatQuotaMb(quota.bufferLimitBytes)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
