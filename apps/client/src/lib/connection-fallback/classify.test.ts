/**
 * Зубы классификатора отказа соединения (#2540, b1). Предмет — `classifyConnectionFailure`:
 * бросок сетевого вызова → класс, статус, деталь, момент.
 *
 * Порчи → красный: 502 без класса `server_error` или без `502` в детали — красный; `TypeError`
 * при `online=false` не `offline` — красный; `TypeError.message` потерян — красный; часы берутся
 * из системы, а не из параметра — красный (момент фиксирован).
 */
import { describe, expect, it } from 'vitest';

import { classifyConnectionFailure, mediaUnreachableFailure, MEDIA_UNREACHABLE_DETAIL } from './classify';
import { HttpResponseError } from './httpResponseError';

const AT = '2026-10-02T06:40:00.000Z';
const now = (): string => AT;

describe('classifyConnectionFailure', () => {
  it('HTTP 502 → server_error, httpStatus 502, деталь несёт номер и текст', () => {
    const f = classifyConnectionFailure(new HttpResponseError(502, 'Bad Gateway'), 'cabinet', { now });
    expect(f).toEqual({
      source: 'cabinet',
      kind: 'server_error',
      httpStatus: 502,
      detail: 'HTTP 502 Bad Gateway',
      at: AT,
    });
  });

  it('HTTP 503/504 → server_error; 429 → rate_limited; 403 → forbidden; 418 → unknown со статусом', () => {
    const kind = (status: number) => classifyConnectionFailure(new HttpResponseError(status, 'x'), 'cabinet', { now }).kind;
    expect(kind(503)).toBe('server_error');
    expect(kind(504)).toBe('server_error');
    expect(kind(429)).toBe('rate_limited');
    expect(kind(403)).toBe('forbidden');
    const odd = classifyConnectionFailure(new HttpResponseError(418, 'teapot'), 'cabinet', { now });
    expect(odd.kind).toBe('unknown');
    expect(odd.httpStatus).toBe(418);
  });

  it('HTTP-ошибка с пустым текстом (HTTP/2 без statusText): деталь — только номер, без хвостового пробела', () => {
    const f = classifyConnectionFailure(new HttpResponseError(502, ''), 'cabinet', { now });
    expect(f.detail).toBe('HTTP 502');
  });

  it('TypeError от fetch при сети → unreachable, деталь = message, статуса нет', () => {
    const f = classifyConnectionFailure(new TypeError('Failed to fetch'), 'cabinet', { now, online: true });
    expect(f).toEqual({ source: 'cabinet', kind: 'unreachable', httpStatus: null, detail: 'Failed to fetch', at: AT });
  });

  it('TypeError при navigator.onLine === false → offline', () => {
    const f = classifyConnectionFailure(new TypeError('Failed to fetch'), 'cabinet', { now, online: false });
    expect(f.kind).toBe('offline');
  });

  it('TypeError без сведений о сети (node) трактуется как unreachable, не offline', () => {
    const f = classifyConnectionFailure(new TypeError('Failed to fetch'), 'cabinet', { now });
    expect(f.kind).toBe('unreachable');
  });

  it('прочая Error → unknown с её message; не-Error → unknown со String(err)', () => {
    expect(classifyConnectionFailure(new Error('boom'), 'pairing', { now })).toMatchObject({
      source: 'pairing',
      kind: 'unknown',
      httpStatus: null,
      detail: 'boom',
    });
    expect(classifyConnectionFailure('weird', 'cabinet', { now }).detail).toBe('weird');
  });

  it('источник доезжает как передан', () => {
    expect(classifyConnectionFailure(new TypeError('x'), 'pairing', { now }).source).toBe('pairing');
  });
});

describe('mediaUnreachableFailure — развилка 5 (константа остаётся)', () => {
  it('источник media, класс unreachable, прежняя строка-деталь', () => {
    expect(mediaUnreachableFailure({ now })).toEqual({
      source: 'media',
      kind: 'unreachable',
      httpStatus: null,
      detail: MEDIA_UNREACHABLE_DETAIL,
      at: AT,
    });
    expect(MEDIA_UNREACHABLE_DETAIL).toBe('media-server unreachable');
  });
});
