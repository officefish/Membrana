/** Длительность, в течение которой повтор от того же sourceId не пробрасывается в UI. */
export const DRONE_DETECTION_DEBOUNCE_MS = 500;

export interface DroneDetectionEvent {
  readonly sourceId: string;
  readonly sourceLabel: string;
  readonly timestamp: number;
  readonly confidence?: number;
}

type DroneDetectionListener = (event: DroneDetectionEvent) => void;

const listeners = new Set<DroneDetectionListener>();
const lastPublishAtBySource = new Map<string, number>();

export function publishDroneDetected(event: DroneDetectionEvent): void {
  const now = event.timestamp || Date.now();
  const last = lastPublishAtBySource.get(event.sourceId) ?? 0;
  if (now - last < DRONE_DETECTION_DEBOUNCE_MS) {
    return;
  }
  lastPublishAtBySource.set(event.sourceId, now);
  for (const fn of listeners) {
    fn(event);
  }
}

export function subscribeDroneDetection(listener: DroneDetectionListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Сброс debounce (тесты). */
export function resetDroneDetectionHubDebounceForTests(): void {
  lastPublishAtBySource.clear();
}
