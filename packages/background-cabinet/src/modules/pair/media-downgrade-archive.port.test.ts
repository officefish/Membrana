/**
 * Зубы порта дверей архива понижения media (#2587 b4): что реально уезжает в сеть и как читаются две
 * формы ответа (200 отказ домена / 201 сделано) против транспортной ошибки.
 *
 * Порт собран на НАСТОЯЩЕМ `MediaBridgeService` (подменён только глобальный `fetch`): транспорт
 * порта — вход моста `requestDowngradeArchive`, своего `fetch` у порта нет (зуб network:bare-fetch).
 */
import { ServiceUnavailableException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaBridgeService } from './media-bridge.service';
import { MediaDowngradeArchiveClient } from './media-downgrade-archive.port';

const CONFIG = { MEDIA_API_URL: 'http://media.test/', MEDIA_API_TOKEN: 'token-1' } as never;
const client = () => new MediaDowngradeArchiveClient(new MediaBridgeService(CONFIG));

function captureFetch(response: { status: number; body?: unknown }) {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return {
        ok: response.status < 300,
        status: response.status,
        statusText: 'x',
        json: async () => response.body,
        text: async () => JSON.stringify(response.body ?? ''),
      } as unknown as Response;
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

const ORDER = {
  criterion: 'loudness-over-floor' as const,
  bufferLimitBytes: 512,
  planDigest: 'd',
  retentionDays: 14,
  membraneId: 'm-1',
  fromTariffId: 'checkpoint-v1',
  toTariffId: 'free-v1',
};

describe('MediaDowngradeArchiveClient', () => {
  it('preview: POST на /v1/devices/:id/downgrade-archive/preview с токеном и телом; 200 ok:true — план как есть', async () => {
    const calls = captureFetch({ status: 200, body: { ok: true, planDigest: 'd', keep: [], freeze: [] } });
    const out = await client().preview('dev-1', { criterion: 'drone-likeness', bufferLimitBytes: 512 });
    expect(out).toMatchObject({ ok: true, planDigest: 'd' });
    expect(calls[0]?.url).toBe('http://media.test/v1/devices/dev-1/downgrade-archive/preview');
    expect((calls[0]?.init.headers as Record<string, string>)['X-Membrana-Token']).toBe('token-1');
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ criterion: 'drone-likeness', bufferLimitBytes: 512 });
  });

  it('freeze: 201 ok:true — ack; 200 ok:false — отказ домена значением (plan_stale), не исключением', async () => {
    captureFetch({ status: 201, body: { ok: true, idempotent: false, batch: { batchId: 'b-1' } } });
    expect(await client().freeze('dev-1', ORDER)).toMatchObject({ ok: true, batch: { batchId: 'b-1' } });
    captureFetch({ status: 200, body: { ok: false, reason: 'plan_stale', detail: 'буфер изменился' } });
    expect(await client().freeze('dev-1', ORDER)).toEqual({ ok: false, reason: 'plan_stale', detail: 'буфер изменился' });
  });

  it('транспорт: 500 и тело без ok — ServiceUnavailableException; сеть недоступна — тоже', async () => {
    captureFetch({ status: 500, body: 'boom' });
    await expect(client().freeze('dev-1', ORDER)).rejects.toThrow(ServiceUnavailableException);
    captureFetch({ status: 200, body: { hello: 'world' } });
    await expect(client().preview('dev-1', { criterion: 'loudness-over-floor', bufferLimitBytes: 1 })).rejects.toThrow(/без поля ok/);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));
    await expect(client().preview('dev-1', { criterion: 'loudness-over-floor', bufferLimitBytes: 1 })).rejects.toThrow(/unreachable/);
  });
});
