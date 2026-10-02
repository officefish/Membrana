/**
 * Зубы запроса состояния сопряжения (#2540, b1). Предмет — `fetchPairStatus`: ошибка HTTP обязана
 * нести номер статуса полем, а не только словом из тела/`statusText`.
 *
 * Порчи → красный: 502 с JSON-телом без `status` в ошибке — красный; 502 с HTML-телом и пустым
 * `statusText` (как при HTTP/2) теряет номер — красный; 401/404 перестали быть сигналами — красный.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isHttpResponseError } from '@/lib/connection-fallback/httpResponseError';

import { fetchPairStatus, pairWithAccessKey } from './pairing';

function respond(status: number, body: string, statusText = '', contentType = 'application/json'): Response {
  return new Response(body, { status, statusText, headers: { 'Content-Type': contentType } });
}

describe('fetchPairStatus — ошибка HTTP несёт статус (#2540)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('502 с JSON {message}: HttpResponseError со status 502 и текстом тела', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(502, JSON.stringify({ message: 'upstream down' }), 'Bad Gateway')));

    const err = await fetchPairStatus('t').catch((e: unknown) => e);

    expect(isHttpResponseError(err)).toBe(true);
    if (!isHttpResponseError(err)) return;
    expect(err.status).toBe(502);
    expect(err.message).toBe('upstream down');
  });

  it('502 с HTML-телом и пустым statusText (HTTP/2): номер статуса не теряется', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(502, '<html>Bad Gateway</html>', '', 'text/html')));

    const err = await fetchPairStatus('t').catch((e: unknown) => e);

    expect(isHttpResponseError(err)).toBe(true);
    if (!isHttpResponseError(err)) return;
    expect(err.status).toBe(502);
    expect(err.message).toBe('Request failed');
  });

  it('429 и 403 — тоже HttpResponseError со своим номером', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(429, JSON.stringify({ message: 'slow down' }))));
    const e429 = await fetchPairStatus('t').catch((e: unknown) => e);
    expect(isHttpResponseError(e429) && e429.status).toBe(429);

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(403, JSON.stringify({ message: ['geo', 'blocked'] }))));
    const e403 = await fetchPairStatus('t').catch((e: unknown) => e);
    expect(isHttpResponseError(e403) && e403.status).toBe(403);
    expect(isHttpResponseError(e403) && e403.message).toBe('geo, blocked');
  });

  it('401 и 404 остаются сигналами, не ошибками', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(401, '')));
    await expect(fetchPairStatus('t')).resolves.toBe('session_expired');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(404, '')));
    await expect(fetchPairStatus('t')).resolves.toBe('endpoint_unavailable');
  });

  it('2xx отдаёт тело как есть', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(200, JSON.stringify({ linked: false }))));
    await expect(fetchPairStatus('t')).resolves.toEqual({ linked: false });
  });

  it('сетевой отказ fetch летит как есть (TypeError), не оборачивается', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const err = await fetchPairStatus('t').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(TypeError);
    expect(isHttpResponseError(err)).toBe(false);
  });
});

describe('pairWithAccessKey — ошибка HTTP несёт статус, message прежний (#2540)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('400 с JSON {message}: status 400, message = текст тела (панель показывает его inline как раньше)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(400, JSON.stringify({ message: 'Invalid access key' }))));

    const err = await pairWithAccessKey('k').catch((e: unknown) => e);

    expect(isHttpResponseError(err)).toBe(true);
    if (!isHttpResponseError(err)) return;
    expect(err.status).toBe(400);
    expect(err.message).toBe('Invalid access key');
  });
});
