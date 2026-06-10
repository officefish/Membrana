import type {
  MediaLibraryCaptureCancelPayload,
  MediaLibraryCaptureStartPayload,
  MediaLibraryCaptureStopPayload,
  MediaLibraryQuotaUpdatedPayload,
} from '@membrana/media-library-service';

type HubListener<T> = (payload: T) => void;

const captureStartListeners = new Set<HubListener<MediaLibraryCaptureStartPayload>>();
const captureStopListeners = new Set<HubListener<MediaLibraryCaptureStopPayload>>();
const captureCancelListeners = new Set<HubListener<MediaLibraryCaptureCancelPayload>>();
const quotaUpdatedListeners = new Set<HubListener<MediaLibraryQuotaUpdatedPayload>>();
const bufferClearedListeners = new Set<() => void>();

export function publishMediaLibraryCaptureStart(
  payload: MediaLibraryCaptureStartPayload,
): void {
  for (const fn of captureStartListeners) fn(payload);
}

export function publishMediaLibraryCaptureStop(
  payload: MediaLibraryCaptureStopPayload,
): void {
  for (const fn of captureStopListeners) fn(payload);
}

export function publishMediaLibraryCaptureCancel(
  payload: MediaLibraryCaptureCancelPayload,
): void {
  for (const fn of captureCancelListeners) fn(payload);
}

export function publishMediaLibraryQuotaUpdated(
  payload: MediaLibraryQuotaUpdatedPayload,
): void {
  for (const fn of quotaUpdatedListeners) fn(payload);
}

export function publishMediaLibraryBufferCleared(): void {
  for (const fn of bufferClearedListeners) fn();
}

export function subscribeMediaLibraryCaptureStart(
  listener: HubListener<MediaLibraryCaptureStartPayload>,
): () => void {
  captureStartListeners.add(listener);
  return () => captureStartListeners.delete(listener);
}

export function subscribeMediaLibraryCaptureStop(
  listener: HubListener<MediaLibraryCaptureStopPayload>,
): () => void {
  captureStopListeners.add(listener);
  return () => captureStopListeners.delete(listener);
}

export function unsubscribeMediaLibraryCaptureStop(
  listener: HubListener<MediaLibraryCaptureStopPayload>,
): void {
  captureStopListeners.delete(listener);
}

export function subscribeMediaLibraryCaptureCancel(
  listener: HubListener<MediaLibraryCaptureCancelPayload>,
): () => void {
  captureCancelListeners.add(listener);
  return () => captureCancelListeners.delete(listener);
}

export function subscribeMediaLibraryQuotaUpdated(
  listener: HubListener<MediaLibraryQuotaUpdatedPayload>,
): () => void {
  quotaUpdatedListeners.add(listener);
  return () => quotaUpdatedListeners.delete(listener);
}

export function subscribeMediaLibraryBufferCleared(listener: () => void): () => void {
  bufferClearedListeners.add(listener);
  return () => bufferClearedListeners.delete(listener);
}

/** Tests: reset all listeners. */
export function resetMediaLibraryHubForTests(): void {
  captureStartListeners.clear();
  captureStopListeners.clear();
  captureCancelListeners.clear();
  quotaUpdatedListeners.clear();
  bufferClearedListeners.clear();
}
