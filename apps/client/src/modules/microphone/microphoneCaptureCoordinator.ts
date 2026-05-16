export interface MicrophoneCaptureSnapshot {
  readonly isLive: boolean;
  readonly error: string | null;
}

export interface MicrophoneCaptureOwner {
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly getSnapshot: () => MicrophoneCaptureSnapshot;
}

let owner: MicrophoneCaptureOwner | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function registerMicrophoneCaptureOwner(handlers: MicrophoneCaptureOwner): () => void {
  owner = handlers;
  emit();
  return () => {
    if (owner === handlers) {
      owner = null;
      emit();
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
  return owner?.getSnapshot() ?? { isLive: false, error: null };
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
  emit();
}
