/**
 * `no-store` на всю ветку открытого API (#2271, вердикт M4).
 *
 * ТРЕБОВАНИЕ, У КОТОРОГО НЕ БЫЛО НОСИТЕЛЯ. На Interface Consilium коворка выяснилось: `no-store`
 * не взял на себя НИ ОДИН блок — `contract` и `key-ttl` независимо назвали его свойством
 * транспорта, `ownership` его не касается. Граница, объявленная вердиктом, осталась без того,
 * кто умеет отказать, — ровно класс, который заседание назвало своей сквозной нитью.
 * Здесь у неё наконец есть исполнитель.
 *
 * ПОЧЕМУ ПЕРЕХВАТЧИКОМ НА ВЕТКУ, А НЕ ЗАГОЛОВКОМ В КАЖДОЙ РУЧКЕ. Поштучная установка держится
 * на памяти автора следующей ручки: добавит четвёртую — и забудет. Перехватчик вешается на
 * контроллер целиком, поэтому новая ручка наследует защиту молча, а не теряет её молча.
 *
 * ЧТО ИМЕННО ЗАЩИЩАЕТСЯ. Тело со списком — СВЯЗКА КЛЮЧЕЙ, а не метаданные каталога (M4):
 * его нельзя писать в обычные логи, кешировать на посреднике и пересылать целиком. Утёкшая
 * связка гасится только ротацией — задний борт, не передний.
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Заголовки ответа со связкой ключей.
 *
 * `Pragma` добавлен ради посредников, не знающих `Cache-Control`: это не дублирование, а вторая
 * аудитория одного требования.
 */
export const CREDENTIAL_BEARING_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
});

@Injectable()
export class NoStoreInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const reply = context.switchToHttp().getResponse<FastifyReply>();
    // Ставим ДО обработчика: ручка, отдающая поток байтов через `reply.send`, к моменту
    // завершения перехватчика уже ушла бы к клиенту без заголовка.
    for (const [name, value] of Object.entries(CREDENTIAL_BEARING_HEADERS)) {
      void reply.header(name, value);
    }
    return next.handle().pipe(tap({ error: () => undefined }));
  }
}
