import { useSyncExternalStore } from 'react';

import {
  micProximityPluginState,
  type MicProximitySnapshot,
} from './micProximityPluginState';

/**
 * useMicProximityAlarm — тонкий мост между UI и singleton-состоянием плагина
 * "mic-proximity-alarm". Вся логика (подписка на кадры движка, трекер тренда)
 * живёт в plugin.install(); хук только читает snapshot через useSyncExternalStore.
 */
export function useMicProximityAlarm(): MicProximitySnapshot {
  return useSyncExternalStore(
    micProximityPluginState.subscribe,
    micProximityPluginState.getSnapshot,
    micProximityPluginState.getSnapshot,
  );
}
