import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Linear подпись считается от raw JSON. В e2e (supertest) `rawBody` иногда отсутствует;
 * в тестах восстанавливаем буфер из уже распарсенного тела (тот же JSON, что у клиента).
 */
export function getLinearWebhookRawBody(req: RawBodyRequest<Request>): Buffer | undefined {
  if (Buffer.isBuffer(req.rawBody) && req.rawBody.length > 0) {
    return req.rawBody;
  }
  if (process.env.NODE_ENV !== 'test') {
    return undefined;
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }
  if (typeof req.body === 'object' && req.body !== null) {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
  }
  return undefined;
}
