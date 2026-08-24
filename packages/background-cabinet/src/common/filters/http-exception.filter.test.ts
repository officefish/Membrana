import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { AllExceptionsFilter } from './http-exception.filter';
import { setIncidentSentryCaptureForTests } from '../incident/incident-sentry';
import {
  CabinetBusyException,
  CabinetUnreachableException,
} from '../incident/failure-genus';
import { INCIDENT_ID_PATTERN } from '../incident/incident-id';

const TMP_PATTERN = /^TMP-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

type Sent = {
  statusCode?: number;
  headers: Record<string, string>;
  payload?: Record<string, unknown>;
};

function makeHost(requestId = 'req-123') {
  const sent: Sent = { headers: {} };
  const reply = {
    status(code: number) {
      sent.statusCode = code;
      return reply;
    },
    header(name: string, value: string) {
      sent.headers[name] = value;
      return reply;
    },
    send(payload: Record<string, unknown>) {
      sent.payload = payload;
      return reply;
    },
  };
  const request = { headers: { 'x-request-id': requestId } };
  const host = {
    switchToHttp: () => ({ getResponse: () => reply, getRequest: () => request }),
  } as never;
  return { host, sent };
}

describe('AllExceptionsFilter — лицо отказа (кусок B, вердикт M1)', () => {
  const filter = new AllExceptionsFilter();

  it('необработанная ошибка → broken: TMP-номер в теле И заголовке, requestId рядом', () => {
    const { host, sent } = makeHost();
    filter.catch(new Error('boom'), host);
    expect(sent.statusCode).toBe(500);
    expect(sent.payload?.genus).toBe('broken');
    expect(sent.payload?.incidentId).toMatch(TMP_PATTERN);
    expect(sent.payload?.incidentId).toMatch(INCIDENT_ID_PATTERN);
    // Заголовок равен литералу тела — сшивка экрана, лога и (позже) картотеки.
    expect(sent.headers['X-Incident-Id']).toBe(sent.payload?.incidentId);
    expect(sent.payload?.requestId).toBe('req-123');
    expect(sent.payload?.message).toBe('Internal server error');
  });

  it('HttpException 5xx → тоже broken с номером (пятисотка без лица неканонична)', () => {
    const { host, sent } = makeHost();
    filter.catch(new HttpException('db exploded', HttpStatus.INTERNAL_SERVER_ERROR), host);
    expect(sent.statusCode).toBe(500);
    expect(sent.payload?.genus).toBe('broken');
    expect(sent.payload?.incidentId).toMatch(TMP_PATTERN);
  });

  it('busy → 503 + Retry-After + «подожди N», номера НЕТ (клиент ждёт, а не разгоняет)', () => {
    const { host, sent } = makeHost();
    filter.catch(new CabinetBusyException(30), host);
    expect(sent.statusCode).toBe(503);
    expect(sent.payload?.genus).toBe('busy');
    expect(sent.payload?.retryAfterS).toBe(30);
    expect(sent.headers['Retry-After']).toBe('30');
    expect(sent.payload?.incidentId).toBeUndefined();
    expect(sent.headers['X-Incident-Id']).toBeUndefined();
    expect(sent.payload?.requestId).toBe('req-123');
  });

  it('unreachable → 503 с именем зависимости, номера НЕТ (блокировка ≠ авария)', () => {
    const { host, sent } = makeHost();
    filter.catch(new CabinetUnreachableException('postgres'), host);
    expect(sent.statusCode).toBe(503);
    expect(sent.payload?.genus).toBe('unreachable');
    expect(sent.payload?.dependency).toBe('postgres');
    expect(sent.payload?.incidentId).toBeUndefined();
  });

  it('обычная 4xx — не отказ кабинета: прежняя форма, без рода и номера, скраб stack/error', () => {
    const { host, sent } = makeHost();
    filter.catch(new BadRequestException({ message: 'bad', stack: 'x', error: 'y' }), host);
    expect(sent.statusCode).toBe(400);
    expect(sent.payload?.genus).toBeUndefined();
    expect(sent.payload?.incidentId).toBeUndefined();
    expect(sent.payload?.message).toBe('bad');
    expect(sent.payload?.stack).toBeUndefined();
    expect(sent.payload?.error).toBeUndefined();
  });

  it('картотека доступна → номер INC-…, событие уезжает с тегом incident_id (кусок E)', () => {
    const captured: Array<{ tags: Record<string, string> }> = [];
    setIncidentSentryCaptureForTests((_e, ctx) => captured.push(ctx));
    try {
      const { host, sent } = makeHost();
      filter.catch(new Error('boom'), host);
      expect(sent.payload?.incidentId).toMatch(/^INC-/);
      expect(sent.headers['X-Incident-Id']).toBe(sent.payload?.incidentId);
      expect(captured).toHaveLength(1);
      expect(captured[0]?.tags.incident_id).toBe(sent.payload?.incidentId);
      expect(captured[0]?.tags.request_id).toBe('req-123');
    } finally {
      setIncidentSentryCaptureForTests(null);
    }
  });

  it('картотека спит (нет DSN) → суррогат TMP, capture не зовётся — куски B–D как были', () => {
    const { host, sent } = makeHost();
    filter.catch(new Error('boom'), host);
    expect(sent.payload?.incidentId).toMatch(/^TMP-/);
  });

  it('requestId без заголовка — пустая строка, не падение', () => {
    const sent: Sent = { headers: {} };
    const reply = {
      status: (c: number) => ((sent.statusCode = c), reply),
      header: (n: string, v: string) => ((sent.headers[n] = v), reply),
      send: (p: Record<string, unknown>) => ((sent.payload = p), reply),
    };
    const host = {
      switchToHttp: () => ({ getResponse: () => reply, getRequest: () => ({ headers: {} }) }),
    } as never;
    filter.catch(new Error('boom'), host);
    expect(sent.payload?.requestId).toBe('');
  });
});
