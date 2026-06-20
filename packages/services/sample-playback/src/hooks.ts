import { useEffect, useSyncExternalStore } from 'react';

import {
  getSamplePlaybackSnapshot,
  stopSamplePlayback,
  subscribeSamplePlayback,
  type SamplePlaybackSnapshot,
} from './service';

/** @internal Exported for unit tests (CRDC D4). */
export function handleSamplePlaybackEscapeKey(event: Pick<KeyboardEvent, 'key' | 'defaultPrevented'>): void {
  if (event.key !== 'Escape' || event.defaultPrevented) return;
  const { status, selectedSampleId } = getSamplePlaybackSnapshot();
  if (selectedSampleId === null) return;
  if (status === 'playing' || status === 'loading') {
    void stopSamplePlayback();
  }
}

/** React-подписка на shared sample playback hub. */
export function useSamplePlayback(): SamplePlaybackSnapshot {
  return useSyncExternalStore(
    subscribeSamplePlayback,
    getSamplePlaybackSnapshot,
    getSamplePlaybackSnapshot,
  );
}

/** Глобальный Escape сбрасывает hub (stop + очистка выбора и кэшей). */
export function useSamplePlaybackEscapeKey(enabled = true): void {
  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      handleSamplePlaybackEscapeKey(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
