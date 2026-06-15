import { useEffect, useSyncExternalStore } from 'react';

import {
  disposeSamplePlayback,
  getSamplePlaybackSnapshot,
  subscribeSamplePlayback,
  type SamplePlaybackSnapshot,
} from './service';

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
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      void disposeSamplePlayback();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
