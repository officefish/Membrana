/**
 * Зубы правила «запрос без тела не объявляет тип тела» (#2287, прод 04.09).
 *
 * Зубы стоят НА ЖИВОМ ПУТИ МОСТА, а не только на чистой функции: дефект был не в правиле, а в
 * том, что правила не было ни в одном месте, через которое запрос проходит. Проверить одну
 * `headersForBody` значило бы удостоверить формулировку, не проверив, применяется ли она.
 *
 * `fetch` подменён, чтобы поймать ровно то, что уехало бы в media, — заголовки и тело.
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaBridgeService, MediaContextRefusedError } from './media-bridge.service';
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
      tariffContractVersion: 2,
      userStorageQuotaBytes: '1',
      bufferQuotaBytes: '2',
      datasetCatalogId: 'cat',
    });
    expect(contentTypeOf(calls[0]!.init)).toBe('application/json');
  });
});

describe('мост в media: доменный отказ разноски (#2308)', () => {
  let bridge: MediaBridgeService;

  beforeEach(() => {
    bridge = new MediaBridgeService(CONFIG);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const CONTEXT = {
    membraneId: 'm-1',
    tariffContractVersion: 2,
    userStorageQuotaBytes: '1',
    bufferQuotaBytes: '2',
    datasetCatalogId: 'cat',
    bufferPolicy: { mode: 'smart_cleanup' as const, params: null as never },
  };

  it('200 { ok:false, reason } — это ОТКАЗ, а не успех (порча: смотреть только на res.ok → красный)', async () => {
    captureFetch({ ok: true, status: 200, body: { ok: false, reason: 'params_incomplete' } });
    await expect(bridge.syncMembraneContext('dev-1', CONTEXT)).rejects.toBeInstanceOf(MediaContextRefusedError);
    await expect(bridge.syncMembraneContext('dev-1', CONTEXT)).rejects.toMatchObject({ reason: 'params_incomplete' });
  });

  it('200 { ok:true, … } — успех; старый media без поля ok — тоже успех (совместимость)', async () => {
    captureFetch({ body: { ok: true, id: 'dev-1', bufferPolicy: { mode: 'stop', params: null } } });
    await expect(bridge.syncMembraneContext('dev-1', CONTEXT)).resolves.toBeUndefined();
    captureFetch({ body: { id: 'dev-1', name: 'x' } });
    await expect(bridge.syncMembraneContext('dev-1', CONTEXT)).resolves.toBeUndefined();
  });

  it('политика уезжает в теле контекста рядом с квотами — второго запроса нет', async () => {
    const calls = captureFetch({ body: { ok: true } });
    await bridge.syncMembraneContext('dev-1', CONTEXT);
    expect(calls).toHaveLength(1);
    const sent = JSON.parse(calls[0]!.init.body as string) as { membrane: { bufferPolicy: unknown } };
    expect(sent.membrane.bufferPolicy).toEqual({ mode: 'smart_cleanup', params: null });
  });

  it('версия тарифного контракта уезжает в том же PATCH-теле, что квоты (порча: забыть поле → красный)', async () => {
    const calls = captureFetch({ body: { ok: true } });
    await bridge.syncMembraneContext('dev-1', CONTEXT);
    const sent = JSON.parse(calls[0]!.init.body as string) as { membrane: { tariffContractVersion?: number } };
    expect(sent.membrane.tariffContractVersion).toBe(2);
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

describe('мост в media: есть ли у прибора замороженный архив (#2632 g8a, Т3)', () => {
  let bridge: MediaBridgeService;

  beforeEach(() => {
    bridge = new MediaBridgeService(CONFIG);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const batch = (state: string, expiresAt: string | null) => ({ batchId: `b-${state}-${expiresAt}`, state, expiresAt });

  it('спрашивает существующую дверь batches методом GET без тела', async () => {
    const calls = captureFetch({ body: { batches: [] } });
    await bridge.hasFrozenArchive('dev 1');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('http://media.test/v1/devices/dev%201/downgrade-archive/batches');
    expect(calls[0]!.init.method).toBe('GET');
    expect(calls[0]!.init.body).toBeUndefined();
  });

  it('frozen-партии есть → frozen:true с БЛИЖАЙШИМ сроком и числом партий (порча: max вместо min → красный)', async () => {
    captureFetch({
      body: {
        batches: [
          batch('frozen', '2026-11-20T10:00:00.000Z'),
          batch('frozen', '2026-11-05T10:00:00.000Z'),
          batch('deleted', '2026-10-01T10:00:00.000Z'),
        ],
      },
    });
    await expect(bridge.hasFrozenArchive('dev-1')).resolves.toEqual({
      frozen: true,
      batchCount: 2,
      nearestExpiresAt: '2026-11-05T10:00:00.000Z',
    });
  });

  it('только restored/deleted/failed → блокировки нет (порча: любая партия = архив → красный)', async () => {
    captureFetch({
      body: { batches: [batch('restored', '2026-11-05T10:00:00.000Z'), batch('deleted', '2026-10-01T10:00:00.000Z'), batch('failed', '2026-10-02T10:00:00.000Z')] },
    });
    await expect(bridge.hasFrozenArchive('dev-1')).resolves.toEqual({ frozen: false });
  });

  it('просроченная, но не снесённая frozen-партия — всё ещё архив', async () => {
    captureFetch({ body: { batches: [batch('frozen', '2020-01-01T00:00:00.000Z')] } });
    await expect(bridge.hasFrozenArchive('dev-1')).resolves.toMatchObject({ frozen: true, batchCount: 1 });
  });

  it('прибор неизвестен media (404) → блокировки нет', async () => {
    captureFetch({ ok: false, status: 404, body: { message: 'Device dev-1 not found' } });
    await expect(bridge.hasFrozenArchive('dev-1')).resolves.toEqual({ frozen: false });
  });

  it('media недоступна по сети → отказ, а не «архива нет» (fail-closed)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    await expect(bridge.hasFrozenArchive('dev-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([500, 502, 503, 401, 403])('media ответила %i → отказ (fail-closed)', async (status) => {
    captureFetch({ ok: false, status, body: { message: 'boom' } });
    await expect(bridge.hasFrozenArchive('dev-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('непонятное тело (нет массива batches) → отказ, а не «архива нет»', async () => {
    captureFetch({ body: { items: [] } });
    await expect(bridge.hasFrozenArchive('dev-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('frozen-партия без читаемого срока → отказ', async () => {
    captureFetch({ body: { batches: [batch('frozen', null)] } });
    await expect(bridge.hasFrozenArchive('dev-1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
