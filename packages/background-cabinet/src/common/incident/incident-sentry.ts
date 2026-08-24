/**
 * Мост кабинета к картотеке Сентри (кусок E #2122, вердикт M1/Т6) —
 * ТОНКИЙ envelope-клиент, НЕ @sentry/node: SDK v9 тащит OTel-хвост, который
 * 24.08 сломал типы панели через lockfile (красный CI PR #2141). Образец
 * тонкого outbound-клиента — office TelegramClient: fire-and-forget,
 * proxy-aware (undici ProxyAgent при HTTPS_PROXY), любая ошибка — warn в лог.
 *
 * Без DSN интеграция СПИТ: чекан остаётся TMP, поведение кабинета не меняется.
 * С DSN отказ рода «сломан» получает INC-…, событие уезжает в картотеку с тегом
 * `incident_id` — запись находима по продиктованному номеру; группировка — по
 * type/value исключения.
 */
import { randomUUID } from 'node:crypto';

export type IncidentTags = { incidentId: string; requestId: string };

type CaptureFn = (exception: unknown, context: { tags: Record<string, string> }) => unknown;

let captureFn: CaptureFn | null = null;

type DsnParts = { origin: string; projectId: string; publicKey: string };

/** https://{key}@{host}/{projectId} → части ингеста; null при неразборной DSN. */
export function parseSentryDsn(dsn: string): DsnParts | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+|\/+$/g, '');
    if (!u.username || !projectId) return null;
    return { origin: `${u.protocol}//${u.host}`, projectId, publicKey: u.username };
  } catch {
    return null;
  }
}

/** Конверт Sentry (3 строки JSON): заголовок · тип item · событие. */
export function buildEnvelope(
  exception: unknown,
  tags: Record<string, string>,
  nowIso: string = new Date().toISOString(),
): { eventId: string; body: string } {
  const eventId = randomUUID().replace(/-/g, '');
  const err = exception instanceof Error ? exception : new Error(String(exception));
  const event = {
    event_id: eventId,
    timestamp: nowIso,
    platform: 'node',
    level: 'error',
    logger: 'background-cabinet',
    exception: {
      values: [{ type: err.name || 'Error', value: err.message || 'unknown' }],
    },
    ...(err.stack ? { extra: { stack: err.stack } } : {}),
    tags,
  };
  const body = `${JSON.stringify({ event_id: eventId, sent_at: nowIso })}\n${JSON.stringify({ type: 'event' })}\n${JSON.stringify(event)}`;
  return { eventId, body };
}

async function postEnvelope(parts: DsnParts, body: string): Promise<void> {
  const url = `${parts.origin}/api/${parts.projectId}/envelope/`;
  const headers = {
    'content-type': 'application/x-sentry-envelope',
    'x-sentry-auth': `Sentry sentry_version=7, sentry_client=membrana-cabinet/1.0, sentry_key=${parts.publicKey}`,
  };
  const proxy = process.env.HTTPS_PROXY?.trim() || process.env.HTTP_PROXY?.trim() || '';
  const { fetch: undiciFetch, ProxyAgent } = await import('undici');
  if (proxy) {
    const dispatcher = new ProxyAgent(proxy);
    try {
      await undiciFetch(url, {
        method: 'POST',
        headers,
        body,
        dispatcher,
        signal: AbortSignal.timeout(10_000),
      } as never);
    } finally {
      await dispatcher.close().catch(() => undefined);
    }
    return;
  }
  await undiciFetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) });
}

export function isIncidentSentryEnabled(): boolean {
  return captureFn !== null;
}

export async function initIncidentSentry(dsn: string | undefined): Promise<void> {
  if (!dsn) return;
  const parts = parseSentryDsn(dsn);
  if (parts === null) {
    // Наблюдаемость не вправе ронять кабинет: битая DSN → остаёмся на TMP.
    // eslint-disable-next-line no-console
    console.error('[incident-sentry] SENTRY_DSN не разобрана — чекан остаётся TMP');
    return;
  }
  captureFn = (exception, context) => {
    const { body } = buildEnvelope(exception, context.tags);
    // Fire-and-forget: картотека не смеет тормозить ответ об отказе.
    void postEnvelope(parts, body).catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.warn(
        '[incident-sentry] событие не доехало до картотеки:',
        err instanceof Error ? err.message : err,
      );
    });
  };
}

export function captureIncident(exception: unknown, tags: IncidentTags): void {
  captureFn?.(exception, {
    tags: { incident_id: tags.incidentId, request_id: tags.requestId },
  });
}

/** Тестовый шов: подменить/сбросить транспорт картотеки. */
export function setIncidentSentryCaptureForTests(fn: CaptureFn | null): void {
  captureFn = fn;
}
