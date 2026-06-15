import {
  seekSamplePlayback,
  type SamplePlaybackSnapshot,
} from '@membrana/sample-playback-service';

import { SampleWaveformScrubber } from '@/components/sample-playback/SampleWaveformScrubber';

export interface JournalTrackPlaybackSectionProps {
  readonly sampleId: string;
  readonly playback: SamplePlaybackSnapshot;
}

/** Waveform row for active live-journal track (TJ8). */
export function JournalTrackPlaybackSection({
  sampleId,
  playback,
}: JournalTrackPlaybackSectionProps) {
  const isActive = playback.selectedSampleId === sampleId;
  if (!isActive) return null;

  const showWaveform = playback.waveform.length > 0 && playback.durationSec > 0;
  const isLoading = playback.status === 'loading';

  return (
    <div
      className="px-2 pb-2"
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {showWaveform ? (
        <SampleWaveformScrubber
          waveform={playback.waveform}
          currentTimeSec={playback.currentTimeSec}
          durationSec={playback.durationSec}
          height={56}
          compact
          onSeek={(ratio) => void seekSamplePlayback(ratio)}
        />
      ) : (
        <p className="text-xs text-base-content/60 flex items-center gap-2" aria-live="polite">
          {isLoading ? (
            <span className="loading loading-spinner loading-xs" aria-hidden />
          ) : null}
          {playback.errorMessage ?? 'Загрузка осциллограммы…'}
        </p>
      )}
    </div>
  );
}
