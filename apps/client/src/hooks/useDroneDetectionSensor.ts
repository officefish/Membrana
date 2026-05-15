import { useSyncExternalStore } from 'react';

import {
  droneDetectionSensorState,
  DRONE_SENSOR_FADE_MS,
} from '../lib/droneDetectionSensorState';

export function useDroneDetectionSensor() {
  const snapshot = useSyncExternalStore(
    droneDetectionSensorState.subscribe,
    droneDetectionSensorState.getSnapshot,
    droneDetectionSensorState.getSnapshot,
  );

  return {
    ...snapshot,
    fadeDurationMs: DRONE_SENSOR_FADE_MS,
    onFadeTransitionEnd: () => droneDetectionSensorState.onFadeTransitionEnd(),
  };
}
