import { isHttpResponseError } from './httpResponseError';

/**
 * Отказ соединения — то, что окно «Сервер недоступен» показывает и что уходит в журнал (#2540).
 *
 * Четыре поля оправданы четырьмя разными решениями читателя (резчик, 02.10): `source` —
 * с кем не вышло (разные слова), `kind` — какой класс выбрать в таблице текстов, `httpStatus` —
 * подстановка номера в текст класса, `detail` — сырая строка приглушённо. `at` — для журнала и
 * строки «когда». Больше полей — декор.
 */
export type ConnectionFailureSource = 'cabinet' | 'media' | 'pairing';

/**
 * Классы, различимые в renderer (Electron и браузер одинаковы — только WHATWG fetch):
 *  - `offline` — `navigator.onLine === false`: сеть на компьютере выключена;
 *  - `unreachable` — `TypeError` от fetch: сеть, DNS, прокси или запрет браузера — в renderer
 *    это один отказ без кода, различить их нельзя (коды `net::ERR_*` есть только в главном
 *    процессе Electron — развилка 3, не этот спринт);
 *  - `server_error` — HTTP 5xx: ответ дошёл, сервер (или прокси перед ним) отказал;
 *  - `rate_limited` — HTTP 429; `forbidden` — HTTP 403;
 *  - `unknown` — всё остальное: факт словами, сырая деталь рядом.
 */
export type ConnectionFailureKind =
  | 'offline'
  | 'unreachable'
  | 'server_error'
  | 'rate_limited'
  | 'forbidden'
  | 'unknown';

export interface ConnectionFailure {
  readonly source: ConnectionFailureSource;
  readonly kind: ConnectionFailureKind;
  /** Номер HTTP-статуса, если ответ дошёл; `null` — ответа не было. */
  readonly httpStatus: number | null;
  /** Сырая деталь: `HTTP 502 Bad Gateway`, `Failed to fetch`, … — приглушённой строкой, не прячется. */
  readonly detail: string;
  /** ISO момента отказа. */
  readonly at: string;
}

export interface ClassifyOptions {
  /** Часы — параметром, чтобы зубы не зависели от системного времени. */
  readonly now?: () => string;
  /** `navigator.onLine`; `undefined` — не известно (node), трактуется как «в сети». */
  readonly online?: boolean;
}

const nowIso = (): string => new Date().toISOString();

const readOnline = (): boolean | undefined =>
  typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? navigator.onLine : undefined;

function kindOfStatus(status: number): ConnectionFailureKind {
  if (status >= 500) return 'server_error';
  if (status === 429) return 'rate_limited';
  if (status === 403) return 'forbidden';
  return 'unknown';
}

/**
 * Единственный классификатор броска сетевого вызова в отказ соединения. Две точки потери на
 * стволе 0eb88efa закрывались им: `parseError` без статуса (статус теперь — поле ошибки) и
 * `catch {}` хука без привязки (ошибка теперь читается, а не выбрасывается).
 */
export function classifyConnectionFailure(
  err: unknown,
  source: ConnectionFailureSource,
  options: ClassifyOptions = {},
): ConnectionFailure {
  const at = (options.now ?? nowIso)();
  const online = options.online ?? readOnline();

  if (isHttpResponseError(err)) {
    return {
      source,
      kind: kindOfStatus(err.status),
      httpStatus: err.status,
      detail: `HTTP ${err.status} ${err.message}`.trim(),
      at,
    };
  }

  if (err instanceof TypeError) {
    return {
      source,
      kind: online === false ? 'offline' : 'unreachable',
      httpStatus: null,
      detail: err.message || 'fetch failed',
      at,
    };
  }

  if (err instanceof Error) {
    return { source, kind: 'unknown', httpStatus: null, detail: err.message || err.name, at };
  }

  return { source, kind: 'unknown', httpStatus: null, detail: String(err), at };
}

/**
 * Отказ media без причины — развилка 5 (умолчание владельца 02.10): `pingMediaApi` возвращает
 * boolean и причину глотает сам; текст-константа остаётся, но едет тем же типом, чтобы окно и
 * журнал имели один носитель. Нести причину из media — отдельный билет.
 */
export const MEDIA_UNREACHABLE_DETAIL = 'media-server unreachable';

export function mediaUnreachableFailure(options: ClassifyOptions = {}): ConnectionFailure {
  return {
    source: 'media',
    kind: 'unreachable',
    httpStatus: null,
    detail: MEDIA_UNREACHABLE_DETAIL,
    at: (options.now ?? nowIso)(),
  };
}
