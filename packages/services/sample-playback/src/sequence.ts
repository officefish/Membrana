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
 *
 * БЮДЖЕТ ОЖИДАНИЯ (#2181, находка долга ревью #2180). Ожидание статуса раньше не имело
 * потолка: хаб застрял (декодер умер, сеть оборвалась, `ended` не пришёл) — промис не
 * резолвился НИКОГДА, и панель висела в проигрывании. Отмена сигналом была, но кнопки
 * отмены в панелях нет, то есть выхода у человека не было. Теперь у каждого ожидания есть
 * названный бюджет, а его исчерпание — обычный отказ рода «ошибка на пробе» с её именем:
 * молчаливого зависания нет, как нет и молчаливого пропуска.
 */
import type { SamplePlaybackSnapshot, SamplePlaybackStatus, SamplePlaybackTarget } from './types';

/**
 * Бюджеты ожидания (#2181). Готовность — фиксированный потолок декодирования; конец
 * воспроизведения — длительность пробы плюс запас (длительность известна из снимка
 * после `select`), а когда она неизвестна, работает отдельный потолок.
 */
export interface SequenceBudgets {
  /** Ожидание готовности после `select` (декод буфера), мс. */
  readonly readyMs: number;
  /** Запас сверх длительности пробы на ожидание `ended`, мс. */
  readonly playSlackMs: number;
  /** Потолок ожидания `ended`, когда длительность неизвестна (0/NaN), мс. */
  readonly playFallbackMs: number;
}

export const DEFAULT_SEQUENCE_BUDGETS: SequenceBudgets = Object.freeze({
  readyMs: 30_000,
  playSlackMs: 5_000,
  playFallbackMs: 120_000,
});

/** Потолок ожидания конца пробы: длительность + запас, иначе — fallback. */
export function playBudgetMs(durationSec: number, budgets: SequenceBudgets): number {
  return Number.isFinite(durationSec) && durationSec > 0
    ? Math.round(durationSec * 1000) + budgets.playSlackMs
    : budgets.playFallbackMs;
}

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

/**
 * Ждать, пока статус хаба не станет одним из названных, но НЕ ДОЛЬШЕ бюджета.
 * `cancel` — отмена сигналом, `timeout` — бюджет исчерпан (хаб не ответил).
 */
function waitForStatus(
  p: SequencePrimitives,
  wanted: readonly SamplePlaybackStatus[],
  signal: AbortSignal | undefined,
  budgetMs: number,
): Promise<SamplePlaybackStatus | 'cancel' | 'timeout'> {
  return new Promise((resolve) => {
    const now = p.snapshot().status;
    if (wanted.includes(now)) {
      resolve(now);
      return;
    }
    let done = false;
    const finish = (v: SamplePlaybackStatus | 'cancel' | 'timeout') => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      unsubscribe();
      signal?.removeEventListener('abort', onAbort);
      resolve(v);
    };
    // Бюджет взводится ДО подписки: хаб, молчащий с самого начала, тоже обязан кончиться.
    const timer = setTimeout(() => finish('timeout'), budgetMs);
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
  budgetOverrides?: Partial<SequenceBudgets>,
): Promise<SequenceOutcome> {
  const budgets: SequenceBudgets = { ...DEFAULT_SEQUENCE_BUDGETS, ...budgetOverrides };
  let played = 0;
  for (const target of targets) {
    if (signal?.aborted) return { played, stoppedBy: 'cancel', failedSampleId: null, error: null };

    await p.select(target);
    // select оставляет хаб в `paused` (буфер загружен) либо в `error` (не раскодировался).
    const ready = await waitForStatus(p, ['paused', 'error'], signal, budgets.readyMs);
    if (ready === 'cancel') return { played, stoppedBy: 'cancel', failedSampleId: null, error: null };
    if (ready === 'timeout') {
      return {
        played,
        stoppedBy: 'error',
        failedSampleId: target.id,
        error: `проба не подготовилась за ${budgets.readyMs} мс — хаб не ответил`,
      };
    }
    if (ready === 'error') {
      return { played, stoppedBy: 'error', failedSampleId: target.id, error: p.snapshot().errorMessage };
    }

    await p.play();
    // Потолок считаем по длительности из снимка: она известна после готовности буфера.
    const playMs = playBudgetMs(p.snapshot().durationSec, budgets);
    const finished = await waitForStatus(p, ['ended', 'error', 'idle'], signal, playMs);
    if (finished === 'cancel') return { played, stoppedBy: 'cancel', failedSampleId: null, error: null };
    if (finished === 'timeout') {
      return {
        played,
        stoppedBy: 'error',
        failedSampleId: target.id,
        error: `проба не доиграла за ${playMs} мс — хаб не ответил`,
      };
    }
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
