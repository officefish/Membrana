import { useCallback, useState } from 'react';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { downloadBlob, extensionFromMime } from '@/lib/downloadBlob';

export interface CabinetLiveJournalTrackCardProps {
  readonly item: LiveJournalItem;
  readonly linkedReportCount: number;
  readonly isPlaying: boolean;
  readonly isActive: boolean;
  readonly onPlay: () => Promise<void>;
  readonly onExportBlob: () => Promise<Blob>;
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function CabinetLiveJournalTrackCard({
  item,
  linkedReportCount,
  isPlaying,
  isActive,
  onPlay,
  onExportBlob,
}: CabinetLiveJournalTrackCardProps) {
  const track = item.track;
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!track) return;
    setExportError(null);
    try {
      const blob = await onExportBlob();
      const ext = extensionFromMime(blob.type);
      downloadBlob(blob, `${track.title}.${ext}`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Не удалось экспортировать клип');
    }
  }, [onExportBlob, track]);

  if (!track) return null;

  return (
    <article className="rounded-lg border border-primary/20 bg-primary/5">
      <header className="flex flex-wrap items-center gap-2 p-2 min-h-10">
        <span className="badge badge-primary badge-sm">Трек</span>
        <span className="text-xs text-base-content/70 tabular-nums">{formatTimestamp(item.timestamp)}</span>
        <span className="text-sm font-medium truncate flex-1 min-w-0">{track.title}</span>
        <span className="text-[10px] text-base-content/50 tabular-nums shrink-0">
          {track.durationSec.toFixed(1)} с · {track.sampleRate} Гц · {track.captureMode}
        </span>
        {linkedReportCount > 0 ? (
          <span className="badge badge-ghost badge-xs tabular-nums">{linkedReportCount} отч.</span>
        ) : null}
        <div className="flex gap-1 shrink-0">
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-10"
            aria-label={isPlaying && isActive ? 'Пауза' : 'Воспроизвести live-клип'}
            onClick={() => void onPlay()}
          >
            {isPlaying && isActive ? 'Пауза' : 'Play'}
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-xs min-h-10"
            aria-label="Экспорт аудио клипа"
            onClick={() => void handleExport()}
          >
            Blob
          </button>
        </div>
      </header>
      {exportError ? <p className="px-2 pb-2 text-xs text-error">{exportError}</p> : null}
    </article>
  );
}
