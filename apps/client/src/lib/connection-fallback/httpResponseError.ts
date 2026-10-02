/**
 * Ошибка HTTP-ответа с номером статуса (#2540).
 *
 * До спринта `api/pairing.ts` бросал `new Error(parseError(res))` — текст тела либо `statusText`,
 * а `res.status` не нёс никогда: при HTTP/2 `statusText` в Chromium пуст, и на 502 от прокси с
 * HTML-телом уходило голое «Request failed». Номер статуса — то единственное, что различает
 * «кабинет ответил ошибкой» от «до кабинета не достучаться», поэтому он едет полем, не словом.
 *
 * `message` остаётся текстом тела/статуса, как раньше: панель сопряжения показывает его inline.
 */
export class HttpResponseError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpResponseError';
    this.status = status;
  }
}

export function isHttpResponseError(err: unknown): err is HttpResponseError {
  return err instanceof HttpResponseError;
}
