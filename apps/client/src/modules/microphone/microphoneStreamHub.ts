/**
 * Шина потока модуля «Микрофон» для плагинов.
 * Плагины подписываются в install() и снимают подписку в возвращаемом callback (сохранить в замыкании).
 */
type StreamListener = (stream: MediaStream | null) => void;

const byModule = new Map<string, Set<StreamListener>>();

/** Last value published per module — replayed when a subscriber attaches after the stream already started. */
const lastStreamByModule = new Map<string, MediaStream | null>();

export function subscribeMicrophoneStream(
  moduleId: string,
  listener: StreamListener,
): () => void {
  let set = byModule.get(moduleId);
  if (!set) {
    set = new Set();
    byModule.set(moduleId, set);
  }
  set.add(listener);
  if (lastStreamByModule.has(moduleId)) {
    listener(lastStreamByModule.get(moduleId)!);
  }
  return () => {
    set!.delete(listener);
    if (set!.size === 0) {
      byModule.delete(moduleId);
    }
  };
}

export function publishMicrophoneStream(
  moduleId: string,
  stream: MediaStream | null,
): void {
  lastStreamByModule.set(moduleId, stream);
  const set = byModule.get(moduleId);
  if (!set) return;
  for (const fn of set) {
    fn(stream);
  }
}

export function resetMicrophoneStreamHubForTests(): void {
  byModule.clear();
  lastStreamByModule.clear();
}
