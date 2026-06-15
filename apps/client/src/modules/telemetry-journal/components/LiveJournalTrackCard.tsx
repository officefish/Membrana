import React, { useCallback, useState } from 'react';
import { BUFFER_COLLECTION_ID, getDefaultMediaLibraryService } from '@membrana/media-library-service';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';
import {
  selectSample,
  togglePlayPause,
  useSamplePlayback,
} from '@membrana/sample-playback-service';

import { downloadBlob, extensionFromMime } from '@/lib/downloadBlob';

export interface LiveJournalTrackCardProps {
  readonly item: LiveJournalItem;
  readonly linkedReportCount: number;
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

export const LiveJournalTrackCard: React.FC<LiveJournalTrackCardProps> = ({
  item,
  linkedReportCount,
}) => {
  const track = item.track;
  const playback = useSamplePlayback();
  const [exportError, setExportError] = useState<string | null>(null);

  const isActive = track != null && playback.selectedSampleId === track.sampleId;
  const isPlaying = isActive && playback.status === 'playing';

  const handlePlay = useCallback(async () => {
    if (!track) return;
    if (!isActive) {
      await selectSample({
        id: track.sampleId,
        title: track.title,
        collectionId: BUFFER_COLLECTION_ID,
      });
    }
    await togglePlayPause();
  }, [isActive, track]);

  const handleExport = useCallback(async () => {
    if (!track) return;
    setExportError(null);
    try {
      const blob = await getDefaultMediaLibraryService().getSampleBlob(track.sampleId);
      const ext = extensionFromMime(blob.type);
      downloadBlob(blob, `${track.title}.${ext}`);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Не удалось экспортировать клип');
    }
  }, [track]);

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
            aria-label={isPlaying ? 'Пауза' : 'Воспроизвести live-клип'}
            onClick={() => void handlePlay()}
          >
            {isPlaying ? 'Пауза' : 'Play'}
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
};
