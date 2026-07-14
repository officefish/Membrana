import { useEffect, useRef, useState } from 'react';
import {
  loadAudioBuffer,
  playBuffer,
  stopPlayback,
} from '@/lib/comparePlayback';
import {
  DETECTOR_LABELS,
  formatDuration,
  formatScore,
  verdictWord,
  type CompareSample,
  type DetectorKey,
} from '@/lib/detectorCompare';
import { downsamplePeaks } from '@/lib/waveformPeaks';

const WAVEFORM_WIDTH = 120;
const WAVEFORM_HEIGHT = 28;

/** Canvas-волна: пики по max-|amp| на бакет; до декода — плоский placeholder. */
function WaveformCanvas({ buffer, sampleId }: { buffer: AudioBuffer | null; sampleId: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const mid = canvas.height / 2;
    if (!buffer) {
      // Ещё не декодировано: тонкая осевая линия (волна появится при прослушивании).
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(0, mid - 0.5, canvas.width, 1);
      return;
    }
    const peaks = downsamplePeaks(buffer.getChannelData(0), canvas.width);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let x = 0; x < peaks.length; x++) {
      const h = Math.max(1, peaks[x]! * (canvas.height - 2));
      ctx.fillRect(x, mid - h / 2, 1, h);
    }
  }, [buffer]);

  return (
    <canvas
      ref={ref}
      width={WAVEFORM_WIDTH}
      height={WAVEFORM_HEIGHT}
      className="rounded bg-base-300"
      role="img"
      aria-label={buffer ? `Волновая форма трека ${sampleId}` : `Волновая форма трека ${sampleId} появится при воспроизведении`}
    />
  );
}

/** Ячейка вердикта: слово + иконка (не только цвет) + скор + «подробнее». */
function VerdictCell({
  sample,
  detector,
  onDetails,
}: {
  sample: CompareSample;
  detector: DetectorKey;
  onDetails: (sample: CompareSample, detector: DetectorKey) => void;
}) {
  const verdict = sample.detectors[detector];
  return (
    <td>
      <div className="flex items-center gap-2">
        <span
          className={`badge badge-sm ${verdict.isDrone ? 'badge-error badge-outline' : 'badge-ghost'}`}
        >
          {verdict.isDrone ? '⚠ ' : '· '}
          {verdictWord(verdict.isDrone)}
        </span>
        <span className="text-xs tabular-nums text-base-content/70">
          {formatScore(verdict.confidence)}
        </span>
        <button
          type="button"
          className="btn btn-ghost btn-xs"
          onClick={() => onDetails(sample, detector)}
          aria-label={`Подробнее: вердикт ${DETECTOR_LABELS[detector]} по треку ${sample.id}`}
          title="Подробнее"
        >
          ⓘ
        </button>
      </div>
    </td>
  );
}

function CompareRow({
  sample,
  playing,
  onPlayingChange,
  onTrackEnded,
  onDetails,
}: {
  sample: CompareSample;
  playing: boolean;
  onPlayingChange: (id: string | null) => void;
  /** Отдельно от onPlayingChange: onended вытесненного трека прилетает ПОСЛЕ
   *  старта нового — сбрасывать playingId можно только если он ещё наш. */
  onTrackEnded: (id: string) => void;
  onDetails: (sample: CompareSample, detector: DetectorKey) => void;
}) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function togglePlay() {
    if (playing) {
      stopPlayback();
      onPlayingChange(null);
      return;
    }
    try {
      setLoading(true);
      setAudioError(null);
      const loaded = buffer ?? (await loadAudioBuffer(sample.id, `/compare-audio/${sample.id}.wav`));
      setBuffer(loaded);
      playBuffer(sample.id, loaded, () => onTrackEnded(sample.id));
      onPlayingChange(sample.id);
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Не удалось воспроизвести трек');
    } finally {
      setLoading(false);
    }
  }

  return (
    <tr className={sample.detectors.trends.isDrone !== sample.detectors.yamnet.isDrone ? 'bg-warning/5' : ''}>
      <td>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-circle btn-ghost btn-sm"
            onClick={() => void togglePlay()}
            disabled={loading}
            aria-label={playing ? `Остановить трек ${sample.id}` : `Прослушать трек ${sample.id}`}
          >
            {loading ? <span className="loading loading-spinner loading-xs" /> : playing ? '⏹' : '▶'}
          </button>
          <WaveformCanvas buffer={buffer} sampleId={sample.id} />
        </div>
        {audioError && (
          <p className="mt-1 text-xs text-error" role="alert">
            {audioError}
          </p>
        )}
      </td>
      <td>
        <div className="font-medium">{sample.id}</div>
        <div className="text-xs text-base-content/60">
          {sample.className ?? '—'} · {formatDuration(sample.durationSec)}
          {sample.meta.source ? ` · ${sample.meta.source}` : ''}
        </div>
        <div className="text-xs text-base-content/50">
          разметка: {verdictWord(sample.isDroneTruth)}
        </div>
      </td>
      <VerdictCell sample={sample} detector="trends" onDetails={onDetails} />
      <VerdictCell sample={sample} detector="yamnet" onDetails={onDetails} />
    </tr>
  );
}

export function CompareTable({
  samples,
  playingId,
  onPlayingChange,
  onTrackEnded,
  onDetails,
}: {
  samples: readonly CompareSample[];
  playingId: string | null;
  onPlayingChange: (id: string | null) => void;
  onTrackEnded: (id: string) => void;
  onDetails: (sample: CompareSample, detector: DetectorKey) => void;
}) {
  if (samples.length === 0) {
    return <p className="py-8 text-center text-sm text-base-content/60">Под фильтр не попал ни один трек.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="table table-sm" aria-label="Треки корпуса с вердиктами детекторов">
        <thead>
          <tr>
            <th>Трек</th>
            <th>Метаданные</th>
            <th>{DETECTOR_LABELS.trends}</th>
            <th>{DETECTOR_LABELS.yamnet}</th>
          </tr>
        </thead>
        <tbody>
          {samples.map((s) => (
            <CompareRow
              key={s.id}
              sample={s}
              playing={playingId === s.id}
              onPlayingChange={onPlayingChange}
              onTrackEnded={onTrackEnded}
              onDetails={onDetails}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
