import { useSyncExternalStore } from 'react';

import {
  combinedDetectionState,
  type CombinedDetectionSnapshot,
} from './combinedDetectionState';

/**
 * useMicCombinedDetection — тонкий мост между UI и singleton-состоянием плагина
 * "mic-combined-detection". Вся логика (окно потока, прогон ансамбля) живёт в
 * plugin.install(); хук только читает snapshot через useSyncExternalStore.
 */
export function useMicCombinedDetection(): CombinedDetectionSnapshot {
  return useSyncExternalStore(
    combinedDetectionState.subscribe,
    combinedDetectionState.getSnapshot,
    combinedDetectionState.getSnapshot,
  );
}
