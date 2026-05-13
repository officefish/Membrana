/**
 * Шина потока модуля «Микрофон» для плагинов.
 * Плагины подписываются в install() и снимают подписку в возвращаемом callback (сохранить в замыкании).
 */
type StreamListener = (stream: MediaStream | null) => void;

const byModule = new Map<string, Set<StreamListener>>();

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
  const set = byModule.get(moduleId);
  if (!set) return;
  for (const fn of set) {
    fn(stream);
  }
}
