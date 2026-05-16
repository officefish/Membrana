export interface MicrophoneCaptureSnapshot {
  readonly isLive: boolean;
  readonly error: string | null;
}

export interface MicrophoneCaptureOwner {
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly getSnapshot: () => MicrophoneCaptureSnapshot;
}

const IDLE_CAPTURE_SNAPSHOT: MicrophoneCaptureSnapshot = { isLive: false, error: null };

let owner: MicrophoneCaptureOwner | null = null;
let snapshotCache: MicrophoneCaptureSnapshot = IDLE_CAPTURE_SNAPSHOT;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function refreshSnapshotCache(): void {
  const next = owner?.getSnapshot() ?? IDLE_CAPTURE_SNAPSHOT;
  if (snapshotCache.isLive === next.isLive && snapshotCache.error === next.error) {
    return;
  }
  snapshotCache =
    next.isLive === IDLE_CAPTURE_SNAPSHOT.isLive && next.error === IDLE_CAPTURE_SNAPSHOT.error
      ? IDLE_CAPTURE_SNAPSHOT
      : { isLive: next.isLive, error: next.error };
  emit();
}

export function registerMicrophoneCaptureOwner(handlers: MicrophoneCaptureOwner): () => void {
  owner = handlers;
  refreshSnapshotCache();
  return () => {
    if (owner === handlers) {
      owner = null;
      if (snapshotCache !== IDLE_CAPTURE_SNAPSHOT) {
        snapshotCache = IDLE_CAPTURE_SNAPSHOT;
        emit();
      }
    }
  };
}

export function subscribeMicrophoneCapture(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMicrophoneCaptureSnapshot(): MicrophoneCaptureSnapshot {
  return snapshotCache;
}

export async function requestMicrophoneStart(): Promise<void> {
  if (owner == null) {
    throw new Error('Модуль «Микрофон» не активен — откройте модуль и повторите.');
  }
  await owner.start();
}

export function requestMicrophoneStop(): void {
  owner?.stop();
}

/** Вызывается модулем при смене isLive / error. */
export function notifyMicrophoneCaptureChanged(): void {
  refreshSnapshotCache();
}
