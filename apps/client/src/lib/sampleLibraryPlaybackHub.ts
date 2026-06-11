import {
  BufferPlayer,
  getMonoChannel,
  loadAudioBuffer,
} from '@membrana/audio-engine-service';
import type { MediaSample } from '@membrana/media-library-service';

import { computePeakEnvelope } from './sampleWaveform';

export type SamplePlaybackStatus =
  | 'idle'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'ended'
  | 'error';

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

const WAVEFORM_POINTS = 512;
const player = new BufferPlayer();
const waveformCache = new Map<string, readonly number[]>();
const bufferCache = new Map<string, AudioBuffer>();

let blobReader: ((sampleId: string) => Promise<Blob>) | null = null;

let snapshot: SamplePlaybackSnapshot = {
  selectedSampleId: null,
  selectedTitle: null,
  selectedCollectionId: null,
  status: 'idle',
  currentTimeSec: 0,
  durationSec: 0,
  waveform: [],
  errorMessage: null,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setSnapshot(patch: Partial<SamplePlaybackSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  emit();
}

function mapPlayerState(): SamplePlaybackStatus {
  const state = player.getState();
  if (state === 'playing' || state === 'starting') return 'playing';
  if (state === 'paused') return 'paused';
  if (state === 'ended') return 'ended';
  if (state === 'error') return 'error';
  if (snapshot.selectedSampleId && state === 'stopped') return 'paused';
  return snapshot.status === 'loading' ? 'loading' : 'idle';
}

function syncProgress(): void {
  setSnapshot({
    status: mapPlayerState(),
    currentTimeSec: player.getCurrentTimeSec(),
    durationSec: player.getDurationSec(),
  });
}

player.on('progress', syncProgress);
player.on('start', syncProgress);
player.on('stop', syncProgress);
player.on('ended', () => {
  setSnapshot({
    status: 'ended',
    currentTimeSec: player.getDurationSec(),
    durationSec: player.getDurationSec(),
  });
});
player.on('error', (error) => {
  setSnapshot({ status: 'error', errorMessage: error.message });
});

export function subscribeSamplePlayback(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSamplePlaybackSnapshot(): SamplePlaybackSnapshot {
  return snapshot;
}

export function bindSamplePlaybackBlobReader(
  reader: (sampleId: string) => Promise<Blob>,
): void {
  blobReader = reader;
}

export function resetSamplePlaybackHubForTests(): void {
  blobReader = null;
  waveformCache.clear();
  bufferCache.clear();
  snapshot = {
    selectedSampleId: null,
    selectedTitle: null,
    selectedCollectionId: null,
    status: 'idle',
    currentTimeSec: 0,
    durationSec: 0,
    waveform: [],
    errorMessage: null,
  };
  listeners.clear();
}

async function loadSampleBuffer(sampleId: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(sampleId);
  if (cached) return cached;
  if (!blobReader) {
    throw new Error('Sample playback blob reader is not bound');
  }
  const blob = await blobReader(sampleId);
  const buffer = await loadAudioBuffer(blob);
  bufferCache.set(sampleId, buffer);
  return buffer;
}

function getWaveformForBuffer(sampleId: string, buffer: AudioBuffer): readonly number[] {
  const cached = waveformCache.get(sampleId);
  if (cached) return cached;
  const mono = getMonoChannel(buffer);
  const envelope = computePeakEnvelope(mono, WAVEFORM_POINTS);
  waveformCache.set(sampleId, envelope);
  return envelope;
}

export async function selectSample(sample: MediaSample | null): Promise<void> {
  await player.stop();
  if (!sample) {
    setSnapshot({
      selectedSampleId: null,
      selectedTitle: null,
      selectedCollectionId: null,
      status: 'idle',
      currentTimeSec: 0,
      durationSec: 0,
      waveform: [],
      errorMessage: null,
    });
    return;
  }

  setSnapshot({
    selectedSampleId: sample.id,
    selectedTitle: sample.title,
    selectedCollectionId: sample.collectionId,
    status: 'loading',
    errorMessage: null,
  });

  try {
    const buffer = await loadSampleBuffer(sample.id);
    setSnapshot({
      status: 'paused',
      currentTimeSec: 0,
      durationSec: buffer.duration,
      waveform: getWaveformForBuffer(sample.id, buffer),
    });
  } catch (error) {
    setSnapshot({
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function togglePlayPause(): Promise<void> {
  if (!snapshot.selectedSampleId) return;

  if (player.getState() === 'playing') {
    await player.pause();
    syncProgress();
    return;
  }

  const cachedBuffer = bufferCache.get(snapshot.selectedSampleId);
  if (cachedBuffer) {
    if (player.getState() === 'paused') {
      await player.resume();
    } else {
      await player.play(cachedBuffer);
    }
    syncProgress();
    return;
  }

  setSnapshot({ status: 'loading', errorMessage: null });
  try {
    const buffer = await loadSampleBuffer(snapshot.selectedSampleId);
    await player.play(buffer);
    syncProgress();
  } catch (error) {
    setSnapshot({
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function seekSamplePlayback(ratio: number): Promise<void> {
  if (!snapshot.selectedSampleId || snapshot.durationSec <= 0) return;
  const offsetSec = Math.max(0, Math.min(1, ratio)) * snapshot.durationSec;
  await player.seek(offsetSec);
  syncProgress();
}

export async function stopSamplePlayback(): Promise<void> {
  await player.stop();
  if (snapshot.selectedSampleId) {
    setSnapshot({
      status: 'paused',
      currentTimeSec: 0,
    });
  } else {
    setSnapshot({ status: 'idle', currentTimeSec: 0 });
  }
}

export async function disposeSamplePlayback(): Promise<void> {
  await player.stop();
  bufferCache.clear();
  setSnapshot({
    selectedSampleId: null,
    selectedTitle: null,
    selectedCollectionId: null,
    status: 'idle',
    currentTimeSec: 0,
    durationSec: 0,
    waveform: [],
    errorMessage: null,
  });
}
