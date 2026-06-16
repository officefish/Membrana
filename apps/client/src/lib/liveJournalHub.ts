export interface JournalSnapshotUpdatedPayload {
  readonly version: number;
  readonly itemCount: number;
}

type HubListener<T> = (payload: T) => void;

const snapshotUpdatedListeners = new Set<HubListener<JournalSnapshotUpdatedPayload>>();

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

/** Tests: reset all listeners. */
export function resetLiveJournalHubForTests(): void {
  snapshotUpdatedListeners.clear();
}
