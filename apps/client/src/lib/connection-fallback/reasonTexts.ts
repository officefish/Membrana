import type { ConnectionFailure, ConnectionFailureKind, ConnectionFailureSource } from './classify';

/**
 * ЕДИНСТВЕННАЯ таблица класс→слова окна «Сервер недоступен» (#2540, по образцу
 * `overflow-window/reasonTexts.ts`). Окно читает ТОЛЬКО отсюда; литерал вне таблицы ловится
 * структурным зубом `structural.test.ts`. `Record<ConnectionFailureKind, …>` требует полноты:
 * новый класс без строки — красный `tsc`.
 *
 * Линза Ожегова: аудитория — оператор прибора. В теле окна нет имён файлов, `fetch`, `TypeError`,
 * кодов проверок; сырая деталь — одной приглушённой строкой со временем (развилка 4, умолчание).
 */

/** Заголовок окна стабилен: факт словами, не «Ошибка 502». */
export const CONNECTION_FALLBACK_TITLE = 'Сервер недоступен';

/** Абзац окна, когда отказа ещё нет в сторе (как до спринта). */
export const CONNECTION_FALLBACK_LEAD =
  'Не удалось связаться с кабинетом или media-server. Анализ можно продолжить в автономном режиме — данные останутся локально.';

/** С кем не вышло — в двух падежах, чтобы фразы читались по-русски. */
export const CONNECTION_SOURCE_NOMINATIVE: Record<ConnectionFailureSource, string> = {
  cabinet: 'Кабинет',
  pairing: 'Кабинет',
  media: 'Сервер записей',
};

export const CONNECTION_SOURCE_INSTRUMENTAL: Record<ConnectionFailureSource, string> = {
  cabinet: 'кабинетом',
  pairing: 'кабинетом',
  media: 'сервером записей',
};

export interface ConnectionFailureText {
  /** Что случилось — одной фразой. `{source}` / `{Source}` / `{status}` подставляются. */
  readonly what: string;
  /** Что делать человеку. */
  readonly todo: string;
}

export const CONNECTION_FAILURE_TEXT: Record<ConnectionFailureKind, ConnectionFailureText> = {
  offline: {
    what: 'Компьютер не в сети.',
    todo: 'Подключите сеть — проверка повторится сама.',
  },
  unreachable: {
    what: 'Связи с {source} нет. Запрос не дошёл до сервера.',
    todo: 'Проверьте интернет и прокси. Если связь есть, а окно повторяется — сообщите нам время с этого экрана.',
  },
  server_error: {
    what: '{Source} ответил ошибкой {status}.',
    todo: 'Это на стороне сервера. Подождите минуту — проверка повторится сама.',
  },
  rate_limited: {
    what: '{Source} просит подождать: слишком много запросов.',
    todo: 'Ничего не делайте — проверка повторится через минуту.',
  },
  forbidden: {
    what: '{Source} отказал в доступе.',
    todo: 'Возможен запрет по региону или прокси. Проверьте, через какую сеть вы выходите.',
  },
  unknown: {
    what: '{Source} не ответил ожидаемо.',
    todo: 'Сообщите нам время с этого экрана.',
  },
};

export interface ConnectionFailureDescription {
  readonly what: string;
  readonly todo: string;
  /** Приглушённая строка: `HH:MM:SS · <сырая деталь>`. */
  readonly raw: string;
}

/** Время факта в локали оператора; непарсимое ISO показываем как есть, не прячем. */
export function formatFailureAt(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  return new Date(t).toLocaleTimeString();
}

export function describeConnectionFailure(failure: ConnectionFailure): ConnectionFailureDescription {
  const text = CONNECTION_FAILURE_TEXT[failure.kind];
  const fill = (s: string): string =>
    s
      .replace('{Source}', CONNECTION_SOURCE_NOMINATIVE[failure.source])
      .replace('{source}', CONNECTION_SOURCE_INSTRUMENTAL[failure.source])
      .replace('{status}', failure.httpStatus === null ? '' : String(failure.httpStatus))
      .replace(/\s+\./g, '.');
  return {
    what: fill(text.what),
    todo: fill(text.todo),
    raw: `${formatFailureAt(failure.at)} · ${failure.detail}`,
  };
}

/** Строка журнала — та же правда, что в окне, плюс ISO и класс, чтобы сверять с логами сервера. */
export function formatFailureJournalLine(failure: ConnectionFailure): string {
  const status = failure.httpStatus === null ? '' : ` http=${failure.httpStatus}`;
  return `[connection] ${failure.at} ${failure.source} ${failure.kind}${status} · ${failure.detail}`;
}
