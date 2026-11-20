/**
 * Зубы клиента журнала уборщика (#2632 g6a). Порчи: другой путь ручки или не GET → красный;
 * не различать 503 `media_not_configured` → красный; фраза с внутренним именем → красный;
 * не-массив вместо журнала проглочен как ошибка → красный (пустой журнал — `[]`).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ColdArchiveApiError,
  describeColdArchiveError,
  fetchColdArchivePulse,
  fetchPurgeRun,
  fetchPurgeRunVerification,
  fetchPurgeRuns,
  fetchPurgeSchedule,
} from './coldArchiveApi';

afterEach(() => vi.unstubAllGlobals());

function mockFetchOnce(status: number, body: unknown) {
  const fn = vi.fn(async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

function call(fn: ReturnType<typeof mockFetchOnce>): [string, RequestInit] {
  return fn.mock.calls[0] as unknown as [string, RequestInit];
}

const RUN = '22222222-2222-4222-8222-222222222222';
const BASE = '/v1/panel/admin/cold-archive';

describe('контракт ручек office g5a — только GET с credentials', () => {
  it('fetchPurgeRuns: путь, limit в строке запроса, массив как есть, не-массив → []', async () => {
    const fn = mockFetchOnce(200, [{ runId: RUN }]);
    expect(await fetchPurgeRuns()).toEqual([{ runId: RUN }]);
    const [url, init] = call(fn);
    expect(url).toBe(`${BASE}/purge-runs`);
    expect(init.credentials).toBe('include');
    expect(init.method).toBeUndefined();

    const fn2 = mockFetchOnce(200, []);
    expect(await fetchPurgeRuns(50)).toEqual([]);
    expect(call(fn2)[0]).toBe(`${BASE}/purge-runs?limit=50`);

    mockFetchOnce(200, { items: [] });
    expect(await fetchPurgeRuns()).toEqual([]);
  });

  it('fetchPurgeRun / verify: id в пути экранирован; без jobs → []', async () => {
    const fn = mockFetchOnce(200, { runId: RUN, jobs: [{ jobId: 'j', status: 'dead_letter' }] });
    expect((await fetchPurgeRun(RUN)).jobs).toHaveLength(1);
    expect(call(fn)[0]).toBe(`${BASE}/purge-runs/${RUN}`);

    const fn2 = mockFetchOnce(200, { runId: RUN, clean: true });
    expect(await fetchPurgeRunVerification('a/b')).toEqual({ runId: RUN, clean: true, jobs: [] });
    expect(call(fn2)[0]).toBe(`${BASE}/purge-runs/a%2Fb/verify`);
  });

  it('fetchPurgeSchedule: путь и limit', async () => {
    const row = { batchId: 'b', membraneId: 'm', deviceId: 'd', expiresAt: '2026-11-21T00:00:00.000Z', frozenBytes: 10 };
    const fn = mockFetchOnce(200, [row]);
    expect(await fetchPurgeSchedule(5)).toEqual([row]);
    expect(call(fn)[0]).toBe(`${BASE}/purge-schedule?limit=5`);
  });

  it('fetchColdArchivePulse: путь ручки g5b, ответ как есть', async () => {
    const view = { mode: 'dry-run', pulse: 'ok', staleAfterMs: 7_200_000, lastSucceededRunAt: null, lastFinishedRunAt: null, checkedAt: 'x' };
    const fn = mockFetchOnce(200, view);
    expect(await fetchColdArchivePulse()).toEqual(view);
    expect(call(fn)[0]).toBe(`${BASE}/pulse`);
    expect(call(fn)[1].credentials).toBe('include');
  });
});

describe('исходы office → ошибка с кодом и человеческой фразой', () => {
  it('503 media_not_configured → notConfigured, без имён переменных', async () => {
    mockFetchOnce(503, { code: 'media_not_configured', missing: ['MEDIA_API_URL'] });
    const err = await fetchPurgeRuns().catch((e: unknown) => e as ColdArchiveApiError);
    expect(err).toBeInstanceOf(ColdArchiveApiError);
    expect(err.notConfigured).toBe(true);
    expect(err.message).toBe('Связь с хранилищем записей не настроена.');
    expect(err.message).not.toContain('MEDIA_API_URL');
  });

  it('502 / 404 run_not_found / 404 без тела / 400 → фразы по коду', async () => {
    mockFetchOnce(502, { code: 'media_unreachable' });
    const e502 = await fetchPurgeRuns().catch((e: unknown) => e as ColdArchiveApiError);
    expect(e502.notConfigured).toBe(false);
    expect(e502.message).toBe('Хранилище записей не отвечает — попробуйте позже.');

    mockFetchOnce(404, { code: 'run_not_found' });
    const e404 = await fetchPurgeRun(RUN).catch((e: unknown) => e as ColdArchiveApiError);
    expect(e404.code).toBe('run_not_found');
    expect(e404.message).toBe('Такого прогона в журнале нет.');

    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => { throw new Error('no body'); } })));
    const eOwner = await fetchPurgeSchedule().catch((e: unknown) => e as ColdArchiveApiError);
    expect(eOwner.code).toBeNull();
    expect(eOwner.message).toBe('Раздел доступен только владельцу — войдите заново.');

    expect(describeColdArchiveError(400, 'invalid_run_id')).toBe('Неверный номер прогона.');
    expect(describeColdArchiveError(500, null)).toBe('Запрос не прошёл (HTTP 500) — попробуйте ещё раз.');
  });
});
