/**
 * Сырое тело multipart для прокси библиотеки (`media-proxy`): загрузка записи едет в media
 * потоком, кабинет её не разбирает и в память целиком не берёт.
 *
 * Регистрируется на экземпляре Fastify при старте (`main.ts`). Других ручек с multipart у кабинета
 * нет; разбор форм кабинет не делает нигде, поэтому парсер «отдай поток как есть» ничего не ломает.
 */
import type { IncomingMessage } from 'node:http';

export const MEDIA_PROXY_RAW_CONTENT_TYPES = ['multipart/form-data'] as const;

type RawParserDone = (err: Error | null, body?: unknown) => void;

export interface ContentTypeParserHost {
  addContentTypeParser(
    contentType: string,
    parser: (req: unknown, payload: IncomingMessage, done: RawParserDone) => void,
  ): unknown;
}

export function registerMediaProxyRawBody(instance: ContentTypeParserHost): void {
  for (const type of MEDIA_PROXY_RAW_CONTENT_TYPES) {
    instance.addContentTypeParser(type, (_req, payload, done) => done(null, payload));
  }
}
