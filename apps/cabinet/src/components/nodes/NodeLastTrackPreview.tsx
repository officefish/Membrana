import { useCallback, useEffect, useState } from 'react';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { fetchNodeTrackBlobUrl } from '@/lib/fetchNodeTrackBlobUrl';

export interface NodeLastTrackPreviewProps {
  readonly deviceId: string;
  readonly deviceLive: boolean;
  readonly lastTrack: LiveJournalItem | null;
  readonly loading: boolean;
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

/** SF7: inline last journal track player on node card (no autoplay). */
export function NodeLastTrackPreview({
  deviceId,
  deviceLive,
  lastTrack,
  loading,
}: NodeLastTrackPreviewProps) {
  const track = lastTrack?.track;
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setError(null);
  }, [track?.sampleId, deviceId]);

  useEffect(
    () => () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    },
    [audioUrl],
  );

  const handlePrepare = useCallback(async () => {
    if (!track || !deviceLive) return;
    setPreparing(true);
    setError(null);
    try {
      const nextUrl = await fetchNodeTrackBlobUrl(deviceId, track.sampleId);
      setAudioUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return nextUrl;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аудио');
    } finally {
      setPreparing(false);
    }
  }, [deviceId, deviceLive, track]);

  if (loading && !track) {
    return (
      <p className="text-xs text-base-content/50">
        <span className="loading loading-spinner loading-xs mr-1" aria-hidden />
        Загрузка журнала…
      </p>
    );
  }

  if (!track || !lastTrack) {
    return <p className="text-xs text-base-content/50">Нет записей в журнале</p>;
  }

  const disabled = !deviceLive;

  return (
    <div className="rounded-lg border border-base-content/10 bg-base-100/60 p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="badge badge-primary badge-xs">Последний трек</span>
        <span className="text-base-content/60 tabular-nums">{formatTimestamp(lastTrack.timestamp)}</span>
        <span className="font-medium truncate flex-1 min-w-0">{track.title}</span>
        <span className="text-base-content/50 tabular-nums shrink-0">
          {track.durationSec.toFixed(1)} с
        </span>
      </div>

      {audioUrl ? (
        <audio controls preload="none" src={audioUrl} className="w-full h-8" />
      ) : (
        <button
          type="button"
          className="btn btn-xs btn-outline"
          disabled={disabled || preparing}
          title={disabled ? 'Узел offline — воспроизведение недоступно' : undefined}
          aria-busy={preparing}
          onClick={() => void handlePrepare()}
        >
          {preparing ? (
            <>
              <span className="loading loading-spinner loading-xs" aria-hidden />
              Загрузка…
            </>
          ) : (
            'Прослушать последний трек'
          )}
        </button>
      )}

      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
