/**
 * Охрана служебной двери кабинета для office (#2588 b2; ADR-0031 п.3, вердикт консилиума 05.10).
 *
 * ПЕРВАЯ входящая служебная дверь кабинета. До неё у кабинета были только сессии пользователей
 * (SessionGuard) и роль admin (AdminGuard); `API_INTERNAL_TOKEN` служил лишь ИСХОДЯЩИМ ключом к media.
 *
 * ОТДЕЛЬНЫЙ КЛЮЧ `CABINET_OFFICE_TOKEN` — не `API_INTERNAL_TOKEN`: один ключ на два направления
 * сделал бы утечку одного доступом к обоим серверам. Схема конфига отказывает на старте, если
 * значения совпали (`env.schema.ts`), а здесь сверяется только CABINET_OFFICE_TOKEN — ключ к media
 * в этой двери не открывает ничего (зуб P6).
 *
 * БЕЗ КЛЮЧА В ENV — дверь СМОНТИРОВАНА, но отвечает 503 с названной причиной (не 401 и не 404):
 * граф модулей Nest статичен, а пробе и оператору нужна причина, не загадка. «Дверь закрыта,
 * потому что ключ не выдан» ≠ «ключ не подошёл». Заголовок — `X-Membrana-Token`, как у всех
 * служебных дверей контура (media ApiTokenGuard, office ApiTokenGuard, cabinet-register #2393).
 *
 * Значение ключа не логируется и в ответы не попадает.
 */
import { timingSafeEqual } from 'node:crypto';

import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { APP_CONFIG } from '../../config/config.tokens';
import type { AppConfig } from '../../config/env.schema';

export const OFFICE_TOKEN_HEADER = 'x-membrana-token';

/** Фраза 503 — буква в букву: по ней пробы отличают «ключ не выдан» от «офис не подключён». */
export const OFFICE_DOOR_NOT_CONFIGURED_MESSAGE = 'office door is not configured (CABINET_OFFICE_TOKEN is not set)';

/** Сравнение без ранней остановки; разная длина — несовпадение без утечки длины через время. */
export function tokensEqual(presented: string, expected: string): boolean {
  const a = Buffer.from(presented, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

@Injectable()
export class OfficeTokenGuard implements CanActivate {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.CABINET_OFFICE_TOKEN;
    if (!expected) {
      throw new ServiceUnavailableException(OFFICE_DOOR_NOT_CONFIGURED_MESSAGE);
    }
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const token = req.headers[OFFICE_TOKEN_HEADER];
    if (typeof token !== 'string' || !token) {
      throw new UnauthorizedException('Missing X-Membrana-Token header');
    }
    if (!tokensEqual(token, expected)) {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }
}
