import { useCallback, useEffect, useRef, useState } from 'react';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';
import { loadAudioBuffer } from '@membrana/audio-engine-service';
import {
  computePeakEnvelope,
  SAMPLE_PLAYBACK_WAVEFORM_POINTS,
} from '@membrana/sample-playback-service';

import { SampleWaveformScrubber } from '@/components/sample-playback/SampleWaveformScrubber';
import { fetchNodeTrackBlob } from '@/lib/fetchNodeTrackBlobUrl';

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

/**
 * SF7 + node-card-track: inline last journal track с waveform-гистограммой (как в
 * библиотеке семплов). Декод и пики — по клику (offline-safe): blob узла →
 * loadAudioBuffer (audio-engine, без сырого Web Audio) → computePeakEnvelope →
 * SampleWaveformScrubber. Воспроизведение — синхронизированный <audio> (seek/прогресс).
 */
export function NodeLastTrackPreview({
  deviceId,
  deviceLive,
  lastTrack,
  loading,
}: NodeLastTrackPreviewProps) {
  const track = lastTrack?.track;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [waveform, setWaveform] = useState<readonly number[]>([]);
  const [durationSec, setDurationSec] = useState(0);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Смена трека/узла → сбросить загруженную осциллограмму.
  useEffect(() => {
    setAudioUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setWaveform([]);
    setDurationSec(0);
    setCurrentTimeSec(0);
    setIsPlaying(false);
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
      const blob = await fetchNodeTrackBlob(deviceId, track.sampleId);
      const buffer = await loadAudioBuffer(blob);
      const peaks = computePeakEnvelope(
        buffer.getChannelData(0),
        SAMPLE_PLAYBACK_WAVEFORM_POINTS,
      );
      setWaveform(peaks);
      setDurationSec(buffer.duration);
      setAudioUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить аудио');
    } finally {
      setPreparing(false);
    }
  }, [deviceId, deviceLive, track]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, []);

  const handleSeek = useCallback(
    (ratio: number) => {
      const el = audioRef.current;
      if (!el || durationSec <= 0) return;
      const next = Math.max(0, Math.min(durationSec, ratio * durationSec));
      el.currentTime = next;
      setCurrentTimeSec(next);
    },
    [durationSec],
  );

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
  const hasWaveform = waveform.length > 0 && audioUrl !== null;

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

      {hasWaveform ? (
        <div className="space-y-2">
          <SampleWaveformScrubber
            waveform={waveform}
            currentTimeSec={currentTimeSec}
            durationSec={durationSec}
            height={56}
            compact
            onSeek={handleSeek}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-xs btn-primary"
              aria-label={isPlaying ? 'Пауза' : 'Воспроизвести последний трек'}
              onClick={togglePlay}
            >
              {isPlaying ? 'Пауза' : 'Play'}
            </button>
            <span className="text-[10px] text-base-content/50 tabular-nums">
              {currentTimeSec.toFixed(1)} / {durationSec.toFixed(1)} с
            </span>
          </div>
          <audio
            ref={audioRef}
            src={audioUrl ?? undefined}
            preload="none"
            className="hidden"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTimeSec(e.currentTarget.currentTime)}
          />
        </div>
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
            'Показать осциллограмму трека'
          )}
        </button>
      )}

      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
