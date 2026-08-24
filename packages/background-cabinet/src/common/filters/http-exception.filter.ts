import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { mintIncidentId } from '../incident/incident-id';
import {
  CabinetBusyException,
  CabinetUnreachableException,
} from '../incident/failure-genus';

/**
 * Лицо отказа кабинета (кусок B #2119, вердикт M1 заседания logging-observability-cut).
 *
 * Три рода отказа — три разных ответа (Т3):
 *   broken      → { genus, incidentId, message, requestId } + заголовок X-Incident-Id;
 *                 тот же литерал номера — строкой в лог (сшивка трёх родов хранения);
 *   busy        → { genus, message, retryAfterS, requestId } + Retry-After; БЕЗ номера;
 *   unreachable → { genus, message, dependency, requestId }; БЕЗ номера.
 * Обычные 4xx (валидация, авторизация) отказом кабинета не являются и сохраняют
 * прежнюю форму тела; X-Request-Id на всех ответах — как раньше (интерсептор).
 *
 * Урок 23.08: голая пятисотка `{message:'Internal server error'}` не давала соединить
 * экран владельца с журналом сервера — теперь у отказа есть номер и род.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest>();
    const requestId =
      typeof req?.headers?.['x-request-id'] === 'string' ? req.headers['x-request-id'] : '';

    if (exception instanceof CabinetBusyException) {
      void res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .header('Retry-After', String(exception.retryAfterS))
        .send({
          genus: 'busy',
          message: exception.message,
          retryAfterS: exception.retryAfterS,
          requestId,
        });
      return;
    }

    if (exception instanceof CabinetUnreachableException) {
      void res.status(HttpStatus.SERVICE_UNAVAILABLE).send({
        genus: 'unreachable',
        message: exception.message,
        dependency: exception.dependency,
        requestId,
      });
      return;
    }

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      // Обычная клиентская ошибка — не отказ кабинета: прежняя форма, без рода и номера.
      const status = exception.getStatus();
      const body = exception.getResponse();
      const payload =
        typeof body === 'string'
          ? { message: body }
          : (body as Record<string, unknown>);
      const safe: Record<string, unknown> = { ...payload };
      delete safe.stack;
      delete safe.error;
      void res.status(status).send(safe);
      return;
    }

    // Род «сломан»: необработанное исключение либо HttpException 5xx.
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const { id: incidentId, source } = mintIncidentId();
    // Тот же литерал номера — в лог: человек диктует номер с экрана, лог даёт
    // окружение по времени, картотека (кусок E) даст след по INC.
    this.logger.error(
      { err: exception, genus: 'broken', incidentId, incidentSource: source, requestId },
      'Unhandled error',
    );
    void res.status(status).header('X-Incident-Id', incidentId).send({
      genus: 'broken',
      incidentId,
      message: 'Internal server error',
      requestId,
    });
  }
}
