import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Три рода отказа — три разных слова (Т3, вердикт M1):
 *   broken      — дефект; ответ несёт номер происшествия и попадает в картотеку;
 *   busy        — затор; клиент ЖДЁТ («подожди N секунд»), а не разгоняет лавину;
 *   unreachable — сеть/блокировка/зависимость не отвечает; с нашей географией
 *                 блокировка выглядит как авария — путать их в журнале запрещено.
 * Номер происшествия несёт ТОЛЬКО broken.
 */
export type FailureGenus = 'broken' | 'busy' | 'unreachable';

/**
 * «Я занят — подожди N секунд». Сервисы кидают его вместо голой 503.
 * `extra` — необязательные предметные числа best-effort в теле (M2: `/health/deep`
 * при отказе всё равно несёт числа); контрактный минимум M1 не меняется.
 */
export class CabinetBusyException extends HttpException {
  constructor(
    public readonly retryAfterS: number,
    message = 'Сервис занят',
    public readonly extra: Record<string, unknown> = {},
  ) {
    super({ genus: 'busy', message, retryAfterS }, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

/** «До зависимости не дойти» — сеть, блокировка, upstream молчит. */
export class CabinetUnreachableException extends HttpException {
  constructor(
    public readonly dependency: string,
    message = 'Зависимость недоступна',
    public readonly extra: Record<string, unknown> = {},
  ) {
    super({ genus: 'unreachable', message, dependency }, HttpStatus.SERVICE_UNAVAILABLE);
  }
}
