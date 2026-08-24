import { describe, expect, it } from 'vitest';

import { buildEnvelope, parseSentryDsn } from './incident-sentry';

describe('incident-sentry — тонкий envelope-клиент (кусок E, без SDK)', () => {
  it('DSN разбирается на ингест-части', () => {
    const p = parseSentryDsn('https://abc123@sentry.mmbrn.tech/2');
    expect(p).toEqual({ origin: 'https://sentry.mmbrn.tech', projectId: '2', publicKey: 'abc123' });
  });

  it('битая/неполная DSN → null (кабинет не падает, чекан остаётся TMP)', () => {
    expect(parseSentryDsn('not a url')).toBeNull();
    expect(parseSentryDsn('https://sentry.mmbrn.tech/2')).toBeNull(); // нет ключа
    expect(parseSentryDsn('https://abc@sentry.mmbrn.tech/')).toBeNull(); // нет проекта
  });

  it('конверт: 3 строки JSON, event_id сквозной, теги и exception на месте', () => {
    const err = new Error('boom');
    const { eventId, body } = buildEnvelope(err, { incident_id: 'INC-AAAA-BBBB', request_id: 'r1' }, '2026-08-24T12:00:00.000Z');
    const [head, item, event] = body.split('\n').map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(eventId).toMatch(/^[0-9a-f]{32}$/);
    expect(head?.event_id).toBe(eventId);
    expect(head?.sent_at).toBe('2026-08-24T12:00:00.000Z');
    expect(item?.type).toBe('event');
    expect(event?.event_id).toBe(eventId);
    expect((event?.tags as Record<string, string>).incident_id).toBe('INC-AAAA-BBBB');
    const values = (event?.exception as { values: Array<{ type: string; value: string }> }).values;
    expect(values[0]).toMatchObject({ type: 'Error', value: 'boom' });
  });

  it('не-Error тоже оборачивается в событие', () => {
    const { body } = buildEnvelope('строкой упало', {}, '2026-08-24T12:00:00.000Z');
    const event = JSON.parse(body.split('\n')[2] ?? '{}') as {
      exception: { values: Array<{ value: string }> };
    };
    expect(event.exception.values[0]?.value).toContain('строкой упало');
  });
});
