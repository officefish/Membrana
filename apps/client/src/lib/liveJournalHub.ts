import type { LiveJournalFilter } from '@membrana/telemetry-journal-service';

export interface JournalSnapshotUpdatedPayload {
  readonly version: number;
  readonly itemCount: number;
}

export interface JournalClearedPayload {
  readonly filter: LiveJournalFilter;
  readonly mediaDeviceId?: string;
  readonly deletedCount: number;
}

type HubListener<T> = (payload: T) => void;

const snapshotUpdatedListeners = new Set<HubListener<JournalSnapshotUpdatedPayload>>();
const clearedListeners = new Set<HubListener<JournalClearedPayload>>();

export function publishJournalSnapshotUpdated(
  payload: JournalSnapshotUpdatedPayload,
): void {
  for (const fn of snapshotUpdatedListeners) fn(payload);
}

export function subscribeJournalSnapshotUpdated(
  listener: HubListener<JournalSnapshotUpdatedPayload>,
): () => void {
  snapshotUpdatedListeners.add(listener);
  return () => snapshotUpdatedListeners.delete(listener);
}

export function publishJournalCleared(payload: JournalClearedPayload): void {
  for (const fn of clearedListeners) fn(payload);
}

export function subscribeJournalCleared(
  listener: HubListener<JournalClearedPayload>,
): () => void {
  clearedListeners.add(listener);
  return () => clearedListeners.delete(listener);
}

/** Tests: reset all listeners. */
export function resetLiveJournalHubForTests(): void {
  snapshotUpdatedListeners.clear();
  clearedListeners.clear();
}
