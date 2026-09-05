/**
 * Зубы правила «запрос без тела не объявляет тип тела» (#2287, прод 04.09).
 *
 * Зубы стоят НА ЖИВОМ ПУТИ МОСТА, а не только на чистой функции: дефект был не в правиле, а в
 * том, что правила не было ни в одном месте, через которое запрос проходит. Проверить одну
 * `headersForBody` значило бы удостоверить формулировку, не проверив, применяется ли она.
 *
 * `fetch` подменён, чтобы поймать ровно то, что уехало бы в media, — заголовки и тело.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaBridgeService } from './media-bridge.service';
import { hasRequestBody, headersForBody } from './request-headers';

const CONFIG = {
  MEDIA_API_URL: 'http://media.test',
  MEDIA_API_TOKEN: 'token-1',
} as never;

/** Что реально ушло бы в сеть. Ответ — минимальный, зубы про запрос, а не про разбор ответа. */
function captureFetch(response: { ok?: boolean; status?: number; body?: unknown } = {}) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fake = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return {
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: async () => response.body ?? {},
      text: async () => JSON.stringify(response.body ?? {}),
      statusText: 'OK',
    } as unknown as Response;
  });
  vi.stubGlobal('fetch', fake);
  return calls;
}

/** Регистр в HTTP не значим — ищем заголовок так же, как его прочитал бы сервер. */
function contentTypeOf(init: RequestInit): string | undefined {
  const headers = init.headers as Record<string, string>;
  const key = Object.keys(headers ?? {}).find((k) => k.toLowerCase() === 'content-type');
  return key ? headers[key] : undefined;
}

describe('мост в media: запросы без тела', () => {
  let bridge: MediaBridgeService;

  beforeEach(() => {
    bridge = new MediaBridgeService(CONFIG);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('выпуск клиентского ключа идёт БЕЗ JSON-заголовка — это и был 400 на проде', async () => {
    const calls = captureFetch({ body: { keyId: 'k-1', raw: 'secret' } });
    await bridge.issueClientKey('dev-1');

    expect(calls).toHaveLength(1);
    expect(calls[0]!.init.body).toBeUndefined();
    expect(contentTypeOf(calls[0]!.init)).toBeUndefined();
    // Токен обязан остаться: снимаем объявление тела, а не всю охрану запроса.
    expect(calls[0]!.init.headers).toMatchObject({ 'X-Membrana-Token': 'token-1' });
  });

  it('отзыв клиентского ключа — тоже без заголовка (DELETE Fastify разбирает как тело)', async () => {
    const calls = captureFetch();
    await bridge.revokeClientKey('dev-1');
    expect(contentTypeOf(calls[0]!.init)).toBeUndefined();
  });

  it('заведение зарезервированных коллекций — без заголовка', async () => {
    const calls = captureFetch();
    await bridge.ensureReservedCollections('dev-1');
    expect(contentTypeOf(calls[0]!.init)).toBeUndefined();
  });

  it('GET-вызовы тоже не лгут о теле, хотя на них Fastify и не падал', async () => {
    // Они не падали лишь потому, что тело GET не разбирается. Заголовок там был так же ложен,
    // и правило одно на все шесть вызовов — иначе класс остался бы открытым.
    const calls = captureFetch({ body: {} });
    await bridge.getQuota('dev-1');
    await bridge.listCollections('dev-1');
    for (const call of calls) expect(contentTypeOf(call.init)).toBeUndefined();
  });
});

describe('мост в media: запросы С телом', () => {
  let bridge: MediaBridgeService;

  beforeEach(() => {
    bridge = new MediaBridgeService(CONFIG);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('регистрация прибора НЕСЁТ JSON-заголовок — иначе media не разберёт тело', async () => {
    const calls = captureFetch({ body: { id: 'dev-1', clientKey: { raw: 'r' } } });
    await bridge.registerDevice('прибор');

    expect(contentTypeOf(calls[0]!.init)).toBe('application/json');
    expect(typeof calls[0]!.init.body).toBe('string');
  });

  it('синхронизация контекста мембраны несёт заголовок и тело', async () => {
    const calls = captureFetch();
    await bridge.syncMembraneContext('dev-1', {
      membraneId: 'm-1',
      userStorageQuotaBytes: '1',
      bufferQuotaBytes: '2',
      datasetCatalogId: 'cat',
    });
    expect(contentTypeOf(calls[0]!.init)).toBe('application/json');
  });
});

describe('правило значением', () => {
  it('тело есть только тогда, когда оно есть: null и пустая строка телом не считаются', () => {
    expect(hasRequestBody(undefined)).toBe(false);
    expect(hasRequestBody(null)).toBe(false);
    expect(hasRequestBody('')).toBe(false);
    expect(hasRequestBody('{}')).toBe(true);
  });

  it('заголовок снимается независимо от регистра — HTTP регистра не различает', () => {
    expect(headersForBody({ 'content-type': 'application/json', 'X-A': '1' }, undefined)).toEqual({
      'X-A': '1',
    });
    expect(headersForBody({ 'CONTENT-TYPE': 'application/json' }, null)).toEqual({});
  });

  it('при наличии тела заголовки не трогаются вовсе', () => {
    const headers = { 'Content-Type': 'application/json', 'X-Membrana-Token': 't' };
    expect(headersForBody(headers, '{"a":1}')).toEqual(headers);
  });

  it('исходные заголовки не мутируются — вызывающий отдаёт их, а не дарит', () => {
    const headers = { 'Content-Type': 'application/json' };
    headersForBody(headers, undefined);
    expect(headers).toEqual({ 'Content-Type': 'application/json' });
  });
});
