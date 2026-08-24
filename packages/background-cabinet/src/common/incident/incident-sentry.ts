/**
 * Мост кабинета к картотеке Сентри (кусок E #2122, вердикт M1/Т6).
 *
 * Без DSN интеграция СПИТ: чекан остаётся TMP, поведение кабинета не меняется —
 * ровно куски B–D. С DSN (контейнер поднят, см. deploy/sentry/README.md) отказ
 * рода «сломан» получает официальный номер INC-…, а событие уезжает в картотеку
 * с тегом `incident_id` — запись находима по продиктованному номеру.
 *
 * SDK подгружается лениво: спящий режим не тянет @sentry/node в рантайм вовсе.
 */
type CaptureFn = (
  exception: unknown,
  context: { tags: Record<string, string> },
) => unknown;

let captureFn: CaptureFn | null = null;

export function isIncidentSentryEnabled(): boolean {
  return captureFn !== null;
}

export async function initIncidentSentry(dsn: string | undefined): Promise<void> {
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({ dsn, tracesSampleRate: 0 });
    captureFn = (exception, context) => Sentry.captureException(exception, context);
  } catch (err) {
    // Наблюдаемость не вправе ронять кабинет: битый модуль/DSN → остаёмся на TMP.
    // eslint-disable-next-line no-console
    console.error('[incident-sentry] init failed — чекан остаётся TMP:', err);
    captureFn = null;
  }
}

export function captureIncident(
  exception: unknown,
  tags: { incidentId: string; requestId: string },
): void {
  captureFn?.(exception instanceof Error ? exception : new Error(String(exception)), {
    tags: { incident_id: tags.incidentId, request_id: tags.requestId },
  });
}

/** Тестовый шов: подменить/сбросить транспорт картотеки. */
export function setIncidentSentryCaptureForTests(fn: CaptureFn | null): void {
  captureFn = fn;
}
