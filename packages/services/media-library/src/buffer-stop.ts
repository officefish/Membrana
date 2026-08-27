/**
 * Остановка записи при заполнении буфера — говорящим словом (#2204, режим 1).
 *
 * ЧТО БЫЛО. Механизм обрыва существует: при исчерпанной квоте `recordingBlocked` гасит
 * активную запись, а панель микрофона пишет «Запись заблокирована — квота буфера исчерпана».
 * Это НЕ то слово, которого просил владелец: человек не узнаёт, что именно остановилось,
 * сколько уже записано и сколько осталось. И приходит оно, когда всё уже кончилось.
 *
 * ЧТО ЗДЕСЬ. Два предиката и одно слово. Предикаты отвечают «пора предупредить» и «пора
 * останавливать», слово собирает человеческую фразу из чисел, которые уже есть у квоты.
 * Ядро одно на все дома — как и у уборки, второй копии порога быть не должно.
 *
 * ТРИ ВОПРОСА ПОСТУЛИРОВАНИЯ НАЗВАНЫ, А НЕ РЕШЕНЫ МОЛЧА. Владелец 27.08 велел их назвать в PR:
 *
 *   1) ПОРОГ В ПРОЦЕНТАХ ИЛИ В МИНУТАХ ЗАПИСИ. Здесь принято: доля буфера, но рядом с ней
 *      всегда считается ОСТАТОК В МИНУТАХ по наблюдаемому темпу записи. Причина выбора: доля
 *      измерима всегда, а минуты — только когда темп известен (на холодном старте темпа нет).
 *      Минуты при этом главнее для человека, поэтому они в слове, а не в пороге. Решение
 *      владельца может это перевернуть — тогда меняется `stopDecision`, и только он.
 *
 *   2) ОСТАНАВЛИВАТЬ НАСОВСЕМ ИЛИ ДО ОСВОБОЖДЕНИЯ. Здесь принято: до освобождения. Решение
 *      живёт в одном месте — поле `resumable` у вердикта; «насовсем» означало бы, что человек
 *      обязан перезапустить сценарий руками даже после уборки, а уборка у нас теперь есть.
 *
 *   3) УЗНАЁТ ЛИ СТОРОЖ ДИСКА (#2118). Здесь принято: НЕ узнаёт, и это осознанный пропуск.
 *      Сторож диска следит за разделом узла и уже шлёт в телеграм; буфер — квота приложения
 *      внутри раздела, и она может кончиться при живом диске. Связать их значило бы сказать
 *      сторожу неправду о диске. Вердикт несёт `notifyDiskWatchdog: false` явным полем, чтобы
 *      слово владельца перевернуло его правкой одной строки, а не поиском по коду.
 */
import { resolveBufferQuota } from './quota-status.js';
import type { StorageQuota } from './types.js';

/**
 * Вход судьи — ПАРА ЧИСЕЛ, а не квота целиком.
 *
 * У двух потребителей разная форма на руках: кабинет держит `StorageQuota`, панель записи в
 * клиенте — уже разложенные `usedBytes`/`limitBytes` из шины. Требовать квоту значило бы
 * заставить одного из них собирать её обратно из чисел, выдумывая `backend` и
 * `serverReachable`, которых он не знает. Для владельцев квоты рядом есть `stopDecisionOf`.
 */
export interface BufferFill {
  readonly usedBytes: number;
  readonly limitBytes: number;
}

/** Доля буфера, после которой человека предупреждают. */
export const BUFFER_STOP_WARN_RATIO = 0.9;

/** Доля буфера, после которой запись останавливается. */
export const BUFFER_STOP_RATIO = 0.98;

export type BufferStopAction = 'run' | 'warn' | 'stop';

export interface BufferStopVerdict {
  readonly action: BufferStopAction;
  /** Занятая доля буфера, 0..1; null — предела нет, судить нечем. */
  readonly filled: number | null;
  /** Сколько байт ещё влезет. */
  readonly freeBytes: number;
  /**
   * Сколько минут записи осталось при наблюдаемом темпе. null — темп неизвестен: на холодном
   * старте его нет, и врать числом нельзя.
   */
  readonly minutesLeft: number | null;
  /**
   * Снимается ли запрет сам, когда место освободится (вопрос 2 постулирования).
   *
   * Это ПОЛИТИКА ядра — «до освобождения, а не насовсем», — а не обещание чужого поведения.
   * Ревью #2214 верно поймало: слово «продолжится сама» обещало то, чего никто не делал.
   * Возобновляет тот, кто останавливал: авторежим записи снимает удержание сам, ручной ждёт
   * человека. Ядро говорит лишь, что запрет временный.
   */
  readonly resumable: boolean;
  /** Уходит ли это сторожу диска #2118 (вопрос 3): нет — буфер не есть диск. */
  readonly notifyDiskWatchdog: boolean;
  /** Готовая фраза человеку: что, почему и сколько осталось. */
  readonly say: string;
}

/**
 * Судит буфер и собирает слово.
 *
 * @param quota квота узла (буферная часть берётся `resolveBufferQuota`)
 * @param p что сейчас идёт и с каким темпом растёт буфер
 */
export function stopDecision(
  fill: BufferFill,
  p: {
    /** Что именно пишет — попадёт в слово. Например «сценарий дежурства». */
    what?: string;
    /** Наблюдаемый темп, байт в минуту. Неизвестен — не передавать. */
    bytesPerMinute?: number;
  } = {},
): BufferStopVerdict {
  const usedBytes = Number(fill.usedBytes) || 0;
  const limitBytes = Number(fill.limitBytes) || 0;
  const what = (p.what ?? '').trim() || 'запись';

  if (!(limitBytes > 0)) {
    // Предела нет — судить нечем. Молча вернуть 'run' с filled=0 значило бы соврать, что
    // измерено и всё в порядке; поле filled=null говорит «не измерено».
    return {
      action: 'run',
      filled: null,
      freeBytes: 0,
      minutesLeft: null,
      resumable: true,
      notifyDiskWatchdog: false,
      say: `${what}: предел буфера не объявлен, судить о заполнении нечем`,
    };
  }

  const filled = usedBytes / limitBytes;
  const freeBytes = Math.max(0, limitBytes - usedBytes);
  const rate = Number(p.bytesPerMinute);
  const minutesLeft =
    Number.isFinite(rate) && rate > 0 ? Math.max(0, Math.floor(freeBytes / rate)) : null;

  const action: BufferStopAction =
    filled >= BUFFER_STOP_RATIO ? 'stop' : filled >= BUFFER_STOP_WARN_RATIO ? 'warn' : 'run';

  return {
    action,
    filled,
    freeBytes,
    minutesLeft,
    resumable: true,
    notifyDiskWatchdog: false,
    say: sayOf(action, what, filled, freeBytes, minutesLeft),
  };
}

/** Тот же судья для владельцев квоты целиком: буферную часть достаёт `resolveBufferQuota`. */
export function stopDecisionOf(
  quota: StorageQuota,
  p: { what?: string; bytesPerMinute?: number } = {},
): BufferStopVerdict {
  return stopDecision(resolveBufferQuota(quota), p);
}

function sayOf(
  action: BufferStopAction,
  what: string,
  filled: number,
  freeBytes: number,
  minutesLeft: number | null,
): string {
  const percent = Math.round(filled * 100);
  const left =
    minutesLeft === null
      ? `свободно ${mb(freeBytes)}`
      : `свободно ${mb(freeBytes)} — это ещё около ${minutesLeft} мин записи`;

  // Имя подставляет вызывающий, и род его заранее неизвестен: «Сценарий дежурства
  // остановлена» — брак, который зуб бы закрепил. Поэтому имя стоит ПОСЛЕ глагола, а не
  // перед ним: так фраза верна для любого рода (P2 ревью #2214).
  if (action === 'stop') {
    // Три вещи в одной фразе: ЧТО остановилось, ПОЧЕМУ и ЧТО делать. Без последнего человек
    // остаётся с фактом и без выхода, а выход у него теперь есть — уборка буфера.
    return `Остановлено: ${what}. Буфер заполнен на ${percent}%, ${left}. Запись станет возможна снова, когда место освободится — уберите лишнее в «Управлении буфером».`;
  }
  if (action === 'warn') {
    return `Буфер заполнен на ${percent}%: ${left}. ${what} пока идёт, но пора убрать лишнее.`;
  }
  return `${what}: буфер заполнен на ${percent}%, ${left}`;
}

function mb(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} МБ`;
}
