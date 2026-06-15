/** Статус воспроизведения сэмпла в shared hub. */
export type SamplePlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

/** Снимок состояния hub для UI (client + cabinet). */
export interface SamplePlaybackSnapshot {
  readonly selectedSampleId: string | null;
  readonly selectedTitle: string | null;
  readonly selectedCollectionId: string | null;
  readonly status: SamplePlaybackStatus;
  readonly currentTimeSec: number;
  readonly durationSec: number;
  readonly waveform: readonly number[];
  readonly errorMessage: string | null;
}

/** Минимальные поля сэмпла для selectSample (без зависимости от media-library). */
export interface SamplePlaybackTarget {
  readonly id: string;
  readonly title: string;
  readonly collectionId: string;
}
