import { Readable } from 'node:stream';

import { Logger, NotFoundException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../config/env.schema';
import type { PrismaService } from '../../prisma/prisma.service';
import { MediaBridgeService } from '../pair/media-bridge.service';

import { MediaProxyService } from './media-proxy.service';

const SERVICE_KEY = 'cabinet-service-value';
const CONFIG = {
  MEDIA_API_URL: 'http://media.test',
  MEDIA_PUBLIC_API_URL: 'http://media.test',
  MEDIA_API_TOKEN: SERVICE_KEY,
} as unknown as AppConfig;

const OWN = '11111111-2222-4333-8444-555555555555';
const FOREIGN = '99999999-2222-4333-8444-555555555555';

interface Seen {
  url: string;
  init: RequestInit & { duplex?: string };
}

function setup(owned: readonly string[] = [OWN]) {
  const seen: Seen[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    seen.push({ url, init });
    // media «эхом» возвращает служебный заголовок и пишет ключ в тело — прокси не должен донести ни то, ни другое
    // дальше списка заголовков; тело — как есть (это ответ media, его форма — не забота прокси).
    return new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-membrana-token': SERVICE_KEY, 'set-cookie': 'a=b' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  const findFirst = vi.fn(async (args: { where: { membrane: { userId: string }; device: { mediaDeviceId: string } } }) =>
    args.where.membrane.userId === 'u-1' && owned.includes(args.where.device.mediaDeviceId) ? { id: 'n-1' } : null,
  );
  const prisma = { node: { findFirst } } as unknown as PrismaService;
  const service = new MediaProxyService(prisma, new MediaBridgeService(CONFIG));
  return { service, seen, fetchMock, findFirst };
}

const base = { userId: 'u-1', deviceId: OWN, headers: {}, body: undefined };

let logs: unknown[][] = [];
beforeEach(() => {
  logs = [];
  for (const level of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
    vi.spyOn(Logger.prototype, level).mockImplementation((...args: unknown[]) => {
      logs.push(args);
    });
  }
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('принадлежность прибора', () => {
  it('свой прибор — запрос уходит в media на тот же путь прибора', async () => {
    const { service, seen } = setup();
    const out = await service.forward({ ...base, method: 'GET', pathWithQuery: '/quota' });
    expect(out.status).toBe(200);
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe(`http://media.test/v1/devices/${OWN}/quota`);
  });

  it('чужой прибор → 404, в media не ходим', async () => {
    const { service, fetchMock } = setup();
    await expect(service.forward({ ...base, deviceId: FOREIGN, method: 'GET', pathWithQuery: '/quota' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('не uuid → 404 без запроса к базе', async () => {
    const { service, fetchMock, findFirst } = setup();
    await expect(service.forward({ ...base, deviceId: 'abc', method: 'GET', pathWithQuery: '/quota' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(findFirst).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('другой пользователь со «своим» прибором → 404', async () => {
    const { service, fetchMock } = setup();
    await expect(service.forward({ ...base, userId: 'u-2', method: 'GET', pathWithQuery: '/quota' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ручка вне списка → 404 тем же словом, в media не ходим', async () => {
    const { service, fetchMock } = setup();
    const err = await service.forward({ ...base, method: 'DELETE', pathWithQuery: '/client-key' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundException);
    expect((err as NotFoundException).message).toBe('Not found');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('служебный ключ остаётся в кабинете', () => {
  it('ключ уходит только в media; браузерный X-Membrana-Token перезаписан; в ответе и в логе ключа нет', async () => {
    const { service, seen } = setup();
    const out = await service.forward({
      ...base,
      method: 'PUT',
      pathWithQuery: '/track-key-ttl',
      headers: { 'x-membrana-token': 'browser-value', authorization: 'Bearer s' },
      body: { mode: 'default' },
    });
    const sent = seen[0]!.init.headers as Record<string, string>;
    expect(sent['X-Membrana-Token']).toBe(SERVICE_KEY);
    expect(Object.values(sent)).not.toContain('browser-value');
    expect(Object.keys(sent).map((k) => k.toLowerCase())).not.toContain('authorization');
    expect(seen[0]!.init.body).toBe('{"mode":"default"}');
    expect(JSON.stringify(out.headers)).not.toContain(SERVICE_KEY);
    expect(out.headers['set-cookie']).toBeUndefined();
    expect(JSON.stringify(logs)).not.toContain(SERVICE_KEY);
  });

  it('отказ media 401 → 502; в лог — без ключа и без заголовков', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"message":"Invalid token"}', { status: 401, headers: { 'content-type': 'application/json' } })),
    );
    const findFirst = vi.fn(async () => ({ id: 'n-1' }));
    const service = new MediaProxyService({ node: { findFirst } } as unknown as PrismaService, new MediaBridgeService(CONFIG));
    const out = await service.forward({ ...base, method: 'GET', pathWithQuery: '/quota' });
    expect(out.status).toBe(502);
    expect(logs.length).toBeGreaterThan(0);
    expect(JSON.stringify(logs)).not.toContain(SERVICE_KEY);
  });

  it('media недоступна — отказ без ключа в тексте', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    const findFirst = vi.fn(async () => ({ id: 'n-1' }));
    const service = new MediaProxyService({ node: { findFirst } } as unknown as PrismaService, new MediaBridgeService(CONFIG));
    const err = await service.forward({ ...base, method: 'GET', pathWithQuery: '/quota' }).catch((e: unknown) => e);
    expect(String((err as Error).message)).not.toContain(SERVICE_KEY);
    expect(JSON.stringify(logs)).not.toContain(SERVICE_KEY);
  });
});

describe('тела', () => {
  it('multipart — сырым потоком, тип с границей сохранён, duplex half', async () => {
    const { service, seen } = setup();
    const stream = Readable.from([Buffer.from('--x\r\nfile\r\n--x--')]);
    await service.forward({
      ...base,
      method: 'POST',
      pathWithQuery: '/collections/__buffer__/samples',
      headers: { 'content-type': 'multipart/form-data; boundary=x' },
      body: stream,
    });
    const init = seen[0]!.init;
    expect((init.headers as Record<string, string>)['content-type']).toBe('multipart/form-data; boundary=x');
    expect(init.duplex).toBe('half');
    expect(init.body).toBeInstanceOf(ReadableStream);
    const text = await new Response(init.body as ReadableStream).text();
    expect(text).toBe('--x\r\nfile\r\n--x--');
  });

  it('бинарь записи — потоком из ответа media, байты целы', async () => {
    const bytes = new Uint8Array([82, 73, 70, 70, 0, 1, 2, 3]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(bytes, { status: 200, headers: { 'content-type': 'audio/wav', 'content-length': '8' } })),
    );
    const findFirst = vi.fn(async () => ({ id: 'n-1' }));
    const service = new MediaProxyService({ node: { findFirst } } as unknown as PrismaService, new MediaBridgeService(CONFIG));
    const out = await service.forward({ ...base, method: 'GET', pathWithQuery: `/samples/${OWN}/blob` });
    expect(out.headers).toEqual({ 'content-type': 'audio/wav', 'content-length': '8' });
    expect(out.body).toBeInstanceOf(Readable);
    const chunks: Buffer[] = [];
    for await (const c of out.body!) chunks.push(Buffer.from(c as Uint8Array));
    expect([...Buffer.concat(chunks)]).toEqual([...bytes]);
  });

  it('GET без тела — без объявления типа тела', async () => {
    const { service, seen } = setup();
    await service.forward({ ...base, method: 'GET', pathWithQuery: '/quota', headers: { 'content-type': 'application/json' } });
    const sent = seen[0]!.init.headers as Record<string, string>;
    expect(Object.keys(sent).map((k) => k.toLowerCase())).not.toContain('content-type');
    expect(seen[0]!.init.body).toBeUndefined();
  });
});
