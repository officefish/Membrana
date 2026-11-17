/**
 * Зубы КЛИЕНТСКОЙ ПОЛОВИНЫ массового вывоза проб из буфера в набор.
 *
 * Предмет — `ServerStorageBackend.moveSamplesBatch` (одна дверь, один запрос) и глагол сервиса
 * `MediaLibraryService.moveSamplesBatch` (named-отказ там, где сервера нет; обновление снимка
 * только когда что-то реально уехало).
 *
 * ПОРЧИ → КРАСНЫЙ:
 *   1. слать пробы по одной (цикл `moveSample`) — «один запрос на пачку» падает по счёту
 *      вызовов fetch;
 *   2. слать `dryRun: true` всегда — «настоящий прогон не помечен dryRun» падает;
 *   3. трактовать непустой `stayed` как ошибку (бросать) — «частичный перенос доходит до
 *      вызывающего» падает;
 *   4. обновлять снимок и при `dryRun` — «dryRun не обходит страницы» падает;
 *   5. молча двигать пробы по одной при бэкенде без сервера — «без сервера — named-отказ»
 *      падает.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BUFFER_COLLECTION_ID } from '../src/constants.js';
import { createServerStorageBackend } from '../src/backends/server-storage-backend.js';
import { MediaLibraryService } from '../src/media-library-service.js';
import { MemoryStorageBackend } from '../src/backends/memory-storage-backend.js';
import type { MoveBatchOutcome } from '../src/types.js';

const BASE = 'https://media.test';
const DEVICE = 'device-1';
const TOKEN = 'token-abc';

const OUTCOME: MoveBatchOutcome = {
  plan: { willMove: 2, willStay: 1, moveBytes: 200, stayBytes: 100 },
  moved: ['s-1', 's-2'],
  stayed: [{ sampleId: 's-3', reason: 'no-space' }],
  userStorage: { usedBytes: 900, limitBytes: 1_000 },
  buffer: { usedBytes: 100, limitBytes: 1_000 },
  maxBatch: 2_000,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function backendWithFetch(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock);
  return createServerStorageBackend({ baseUrl: BASE, deviceId: DEVICE, mediaToken: TOKEN });
}

describe('ServerStorageBackend.moveSamplesBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('один запрос на всю пачку, не запрос на пробу', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(OUTCOME));
    const backend = backendWithFetch(fetchMock);

    const out = await backend.moveSamplesBatch(['s-1', 's-2', 's-3'], 'col-user');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe(`${BASE}/v1/devices/${DEVICE}/samples/move-batch`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      sampleIds: ['s-1', 's-2', 's-3'],
      toCollectionId: 'col-user',
    });
    expect(out).toEqual(OUTCOME);
  });

  it('настоящий прогон не помечен dryRun, а план — помечен', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(OUTCOME));
    const backend = backendWithFetch(fetchMock);

    await backend.moveSamplesBatch(['s-1'], 'col-user');
    await backend.moveSamplesBatch(['s-1'], 'col-user', { dryRun: true });

    const real = JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body));
    const planned = JSON.parse(String((fetchMock.mock.calls[1] as [string, RequestInit])[1].body));
    expect(real.dryRun).toBeUndefined();
    expect(planned.dryRun).toBe(true);
  });

  it('частичный перенос доходит до вызывающего как исход, а не как ошибка', async () => {
    const backend = backendWithFetch(vi.fn(async () => jsonResponse(OUTCOME)));

    const out = await backend.moveSamplesBatch(['s-1', 's-2', 's-3'], 'col-user');

    expect(out.stayed).toEqual([{ sampleId: 's-3', reason: 'no-space' }]);
    expect(out.plan.willMove).toBe(2);
  });

  it('пустой список не уезжает на сервер', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(OUTCOME));
    const backend = backendWithFetch(fetchMock);

    await expect(backend.moveSamplesBatch([], 'col-user')).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('отказ целиком остаётся ошибкой транспорта', async () => {
    const backend = backendWithFetch(
      vi.fn(async () => jsonResponse({ message: 'toCollectionId is the buffer itself' }, 400)),
    );

    await expect(
      backend.moveSamplesBatch(['s-1'], BUFFER_COLLECTION_ID),
    ).rejects.toThrow();
  });
});

describe('MediaLibraryService.moveSamplesBatch', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('без серверной библиотеки — named-отказ, а не тихий перенос по одной', async () => {
    const service = new MediaLibraryService(new MemoryStorageBackend());
    await service.init();

    await expect(service.moveSamplesBatch(['s-1'], 'col-user')).rejects.toThrow(
      /серверной библиотеке/u,
    );
  });

  it('dryRun не обходит страницы набора: снимок не обновляется', async () => {
    const backend = {
      moveSamplesBatch: vi.fn(async () => ({ ...OUTCOME, moved: [] })),
    };
    const service = new MediaLibraryService(backend as never);
    const refresh = vi.spyOn(service, 'refresh').mockResolvedValue(undefined as never);

    await service.moveSamplesBatch(['s-1'], 'col-user', { dryRun: true });

    expect(backend.moveSamplesBatch).toHaveBeenCalledWith(['s-1'], 'col-user', { dryRun: true });
    expect(refresh).not.toHaveBeenCalled();
  });

  it('после реального переноса снимок обновляется', async () => {
    const backend = { moveSamplesBatch: vi.fn(async () => OUTCOME) };
    const service = new MediaLibraryService(backend as never);
    const refresh = vi.spyOn(service, 'refresh').mockResolvedValue(undefined as never);

    const out = await service.moveSamplesBatch(['s-1', 's-2', 's-3'], 'col-user');

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(out.moved).toEqual(['s-1', 's-2']);
  });
});
