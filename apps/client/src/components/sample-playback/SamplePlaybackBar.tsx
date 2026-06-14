import React from 'react';

import {
  formatPlaybackTime,
  seekSamplePlayback,
  togglePlayPause,
  type SamplePlaybackSnapshot,
} from '@membrana/sample-playback-service';

import { SampleWaveformScrubber } from './SampleWaveformScrubber';

export interface SamplePlaybackBarProps {
  readonly playback: SamplePlaybackSnapshot;
  readonly compact?: boolean;
  readonly onExport?: () => void;
  readonly showExport?: boolean;
}

export const SamplePlaybackBar: React.FC<SamplePlaybackBarProps> = ({
  playback,
  compact = false,
  onExport,
  showExport = false,
}) => {
  const isPlaying = playback.status === 'playing';
  const isLoading = playback.status === 'loading';
  const hasSelection = playback.selectedSampleId != null;

  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-base-300 bg-base-200/40 ${
        compact ? 'p-2' : 'p-4'
      }`}
      role="status"
      aria-busy={isLoading}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={`btn btn-circle ${compact ? 'btn-xs' : 'btn-sm'} btn-primary`}
          disabled={!hasSelection || isLoading}
          aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
          onClick={() => void togglePlayPause()}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div className="min-w-0 flex-1">
          <p className={`truncate font-medium ${compact ? 'text-sm' : 'text-base'}`}>
            {playback.selectedTitle ?? 'Сэмпл не выбран'}
          </p>
          {!compact && playback.selectedSampleId ? (
            <p className="text-xs text-base-content/55 tabular-nums">
              {formatPlaybackTime(playback.currentTimeSec)} /{' '}
              {formatPlaybackTime(playback.durationSec)}
            </p>
          ) : null}
        </div>
        {compact ? (
          <span className="text-xs tabular-nums text-base-content/60">
            {formatPlaybackTime(playback.currentTimeSec)} /{' '}
            {formatPlaybackTime(playback.durationSec)}
          </span>
        ) : null}
        {showExport && onExport ? (
          <button
            type="button"
            className={`btn btn-ghost ${compact ? 'btn-xs' : 'btn-sm'}`}
            disabled={!hasSelection || isLoading}
            aria-label="Экспорт сэмпла"
            onClick={onExport}
          >
            Экспорт
          </button>
        ) : null}
      </div>

      {hasSelection && playback.waveform.length > 0 ? (
        <SampleWaveformScrubber
          waveform={playback.waveform}
          currentTimeSec={playback.currentTimeSec}
          durationSec={playback.durationSec}
          compact={compact}
          height={compact ? 40 : 140}
          onSeek={(ratio) => void seekSamplePlayback(ratio)}
        />
      ) : (
        <p className="text-xs text-base-content/50">
          {hasSelection ? 'Загрузка осциллограммы…' : 'Выберите сэмпл в таблице'}
        </p>
      )}

      {playback.errorMessage ? (
        <div className="alert alert-error py-2 text-xs" role="alert">
          {playback.errorMessage}
        </div>
      ) : null}
    </div>
  );
};
