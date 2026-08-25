/**
 * «Послушать подряд» — общее ядро для обоих близнецов библиотеки (#2109, b3).
 *
 * ЗАЧЕМ ОБЩЕЕ. Чистка дублей показывает пару «представитель + похожий» и просит человека
 * решить слухом; решить можно, только услышав обоих один за другим без рук. Studio и кабинет
 * обязаны делать это одинаково (слово владельца 24.08: близнецы), а сервис воспроизведения —
 * единственное общее место, где живёт сам плеер.
 *
 * ФОРМА. Примитивы (`select`, `play`, `subscribe`, `snapshot`) приходят значением: ядро
 * зубится без AudioContext, а живой хаб подставляет свои. Последовательность — не очередь и не
 * плейлист: она играет ровно переданные адреса по одному, ждёт `ended` и идёт дальше; `error`
 * останавливает её на месте с названием пробы, а не пропускает молча (молча пропущенный
 * «похожий» — тот, о котором человек решит, не услышав). Отмена — сигналом, между пробами.
 */
import type { SamplePlaybackSnapshot, SamplePlaybackStatus, SamplePlaybackTarget } from './types';

export interface SequencePrimitives {
  readonly select: (target: SamplePlaybackTarget) => Promise<void>;
  /** Запуск воспроизведения выбранной пробы (у хаба это togglePlayPause из `paused`). */
  readonly play: () => Promise<void>;
  readonly subscribe: (listener: () => void) => () => void;
  readonly snapshot: () => SamplePlaybackSnapshot;
}

export interface SequenceOutcome {
  /** Сколько проб прозвучало целиком. */
  readonly played: number;
  /** Чем кончилось: все прозвучали · отменено · ошибка на пробе. */
  readonly stoppedBy: 'complete' | 'cancel' | 'error';
  readonly failedSampleId: string | null;
  readonly error: string | null;
}

/** Ждать, пока статус хаба не станет одним из названных. Возвращает достигнутый. */
function waitForStatus(
  p: SequencePrimitives,
  wanted: readonly SamplePlaybackStatus[],
  signal?: AbortSignal,
): Promise<SamplePlaybackStatus | 'cancel'> {
  return new Promise((resolve) => {
    const now = p.snapshot().status;
    if (wanted.includes(now)) {
      resolve(now);
      return;
    }
    let done = false;
    const finish = (v: SamplePlaybackStatus | 'cancel') => {
      if (done) return;
      done = true;
      unsubscribe();
      signal?.removeEventListener('abort', onAbort);
      resolve(v);
    };
    const onAbort = () => finish('cancel');
    const unsubscribe = p.subscribe(() => {
      const s = p.snapshot().status;
      if (wanted.includes(s)) finish(s);
    });
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
  });
}

export async function playSequence(
  p: SequencePrimitives,
  targets: readonly SamplePlaybackTarget[],
  signal?: AbortSignal,
): Promise<SequenceOutcome> {
  let played = 0;
  for (const target of targets) {
    if (signal?.aborted) return { played, stoppedBy: 'cancel', failedSampleId: null, error: null };

    await p.select(target);
    // select оставляет хаб в `paused` (буфер загружен) либо в `error` (не раскодировался).
    const ready = await waitForStatus(p, ['paused', 'error'], signal);
    if (ready === 'cancel') return { played, stoppedBy: 'cancel', failedSampleId: null, error: null };
    if (ready === 'error') {
      return { played, stoppedBy: 'error', failedSampleId: target.id, error: p.snapshot().errorMessage };
    }

    await p.play();
    const finished = await waitForStatus(p, ['ended', 'error', 'idle'], signal);
    if (finished === 'cancel') return { played, stoppedBy: 'cancel', failedSampleId: null, error: null };
    if (finished === 'error') {
      return { played, stoppedBy: 'error', failedSampleId: target.id, error: p.snapshot().errorMessage };
    }
    if (finished === 'idle') {
      // Кто-то выбрал другое (selectSample(null)) — человек перехватил плеер; это отмена, не ошибка.
      return { played, stoppedBy: 'cancel', failedSampleId: null, error: null };
    }
    played += 1;
  }
  return { played, stoppedBy: 'complete', failedSampleId: null, error: null };
}
