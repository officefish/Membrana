/**
 * Зубы таблицы слов окна «Сервер недоступен» (#2540, b1). Предмет — `describeConnectionFailure`
 * и `formatFailureJournalLine`.
 *
 * Порчи → красный: в тексте класса server_error нет номера статуса — красный; приглушённая строка
 * без времени или без сырой детали — красный; строка журнала без ISO и класса — красный; в словах
 * окна жаргон (`fetch`, `TypeError`, имена файлов) — красный.
 */
import { describe, expect, it } from 'vitest';

import type { ConnectionFailure } from './classify';
import {
  CONNECTION_FAILURE_TEXT,
  CONNECTION_FALLBACK_TITLE,
  describeConnectionFailure,
  formatFailureAt,
  formatFailureJournalLine,
} from './reasonTexts';

const AT = '2026-10-02T06:40:12.000Z';

const failure = (over: Partial<ConnectionFailure>): ConnectionFailure => ({
  source: 'cabinet',
  kind: 'unreachable',
  httpStatus: null,
  detail: 'Failed to fetch',
  at: AT,
  ...over,
});

describe('describeConnectionFailure', () => {
  it('server_error 502 от кабинета: «Кабинет ответил ошибкой 502.», что делать, время и деталь приглушённо', () => {
    const d = describeConnectionFailure(failure({ kind: 'server_error', httpStatus: 502, detail: 'HTTP 502 Bad Gateway' }));
    expect(d.what).toBe('Кабинет ответил ошибкой 502.');
    expect(d.todo).toContain('на стороне сервера');
    expect(d.raw).toBe(`${formatFailureAt(AT)} · HTTP 502 Bad Gateway`);
  });

  it('unreachable от кабинета: «Связи с кабинетом нет…»; от media — «…с сервером записей…»', () => {
    expect(describeConnectionFailure(failure({})).what).toBe('Связи с кабинетом нет. Запрос не дошёл до сервера.');
    expect(describeConnectionFailure(failure({ source: 'media', detail: 'media-server unreachable' })).what).toBe(
      'Связи с сервером записей нет. Запрос не дошёл до сервера.',
    );
  });

  it('offline / rate_limited / forbidden / unknown — свои фразы, без пустых подстановок', () => {
    expect(describeConnectionFailure(failure({ kind: 'offline' })).what).toBe('Компьютер не в сети.');
    expect(describeConnectionFailure(failure({ kind: 'rate_limited', httpStatus: 429 })).what).toBe(
      'Кабинет просит подождать: слишком много запросов.',
    );
    expect(describeConnectionFailure(failure({ kind: 'forbidden', httpStatus: 403 })).what).toBe('Кабинет отказал в доступе.');
    const unknown = describeConnectionFailure(failure({ kind: 'unknown', detail: 'boom' }));
    expect(unknown.what).toBe('Кабинет не ответил ожидаемо.');
    expect(unknown.raw).toContain('boom');
    for (const k of Object.keys(CONNECTION_FAILURE_TEXT) as Array<keyof typeof CONNECTION_FAILURE_TEXT>) {
      const d = describeConnectionFailure(failure({ kind: k, httpStatus: k === 'server_error' ? 500 : null }));
      expect(d.what).not.toMatch(/\{|\}/u);
      expect(d.todo).not.toMatch(/\{|\}/u);
    }
  });

  it('линза Ожегова: в словах окна нет жаргона', () => {
    const words = Object.values(CONNECTION_FAILURE_TEXT).flatMap((t) => [t.what, t.todo]).join(' ');
    expect(words).not.toMatch(/fetch|TypeError|\.ts\b|HTTP|CORS|prox[yi]\b/u);
    expect(CONNECTION_FALLBACK_TITLE).toBe('Сервер недоступен');
  });

  it('непарсимое время показывается как есть, не прячется', () => {
    expect(formatFailureAt('не-время')).toBe('не-время');
  });
});

describe('formatFailureJournalLine', () => {
  it('несёт ISO-момент, источник, класс, статус и деталь', () => {
    const line = formatFailureJournalLine(failure({ kind: 'server_error', httpStatus: 502, detail: 'HTTP 502 Bad Gateway' }));
    expect(line).toBe(`[connection] ${AT} cabinet server_error http=502 · HTTP 502 Bad Gateway`);
  });

  it('без статуса — без поля http=', () => {
    expect(formatFailureJournalLine(failure({}))).toBe(`[connection] ${AT} cabinet unreachable · Failed to fetch`);
  });
});
