/**
 * Прослушивание треков борда detector-compare: ОДИН AudioContext на страницу,
 * старт нового трека останавливает предыдущий (анти-какофония — урок
 * библиотеки сэмплов; вердикт консилиума detector-compare-board-2026-07-14).
 * Wav отдаётся статикой /compare-audio/<id>.wav без перекодирования.
 */

let sharedContext: AudioContext | null = null;

/** Ленивый общий контекст: создаётся по первому воспроизведению (autoplay policy). */
export function getAudioContext(): AudioContext {
  if (sharedContext === null) {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

const bufferCache = new Map<string, AudioBuffer>();

/** Fetch + decode wav; AudioBuffer кэшируется на id (повторный play мгновенный). */
export async function loadAudioBuffer(id: string, url: string): Promise<AudioBuffer> {
  const cached = bufferCache.get(id);
  if (cached) return cached;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Аудио недоступно (${response.status}) — бандл /compare-audio не задеплоен?`);
  }
  const buffer = await getAudioContext().decodeAudioData(await response.arrayBuffer());
  bufferCache.set(id, buffer);
  return buffer;
}

interface CurrentPlayback {
  readonly id: string;
  readonly source: AudioBufferSourceNode;
}

let current: CurrentPlayback | null = null;

/** Остановить текущий трек (если играет). */
export function stopPlayback(): void {
  if (current !== null) {
    const { source } = current;
    current = null;
    try {
      // stop() штатно триггерит onended вытесняемого трека — его строка
      // в таблице сама сбросит состояние «играет».
      source.stop();
    } catch {
      // уже остановлен — ок
    }
  }
}

/**
 * Запустить трек: предыдущий всегда останавливается. onEnded зовётся и при
 * естественном конце, и при вытеснении другим треком/стопом.
 */
export function playBuffer(id: string, buffer: AudioBuffer, onEnded: () => void): void {
  stopPlayback();
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    void ctx.resume();
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.onended = () => {
    if (current?.source === source) {
      current = null;
    }
    onEnded();
  };
  current = { id, source };
  source.start();
}

export function playingTrackId(): string | null {
  return current?.id ?? null;
}
