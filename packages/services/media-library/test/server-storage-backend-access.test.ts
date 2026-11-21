import { afterEach, describe, expect, it, vi } from 'vitest';

import { createServerStorageBackend } from '../src/backends/server-storage-backend.js';

/**
 * Два способа доступа к библиотеке прибора: напрямую в media ключом прибора (Студия, веб-клиент
 * прибора) и через сервер кабинета сессией пользователя (браузер кабинета). Путь Студии не меняется.
 */

const DEVICE = '11111111-2222-4333-8444-555555555555';

interface Seen {
  url: string;
  headers: Headers;
}

function stubFetch(): Seen[] {
  const seen: Seen[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      seen.push({ url: String(url), headers: new Headers(init?.headers) });
      return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
  return seen;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('доступ к библиотеке прибора', () => {
  it('Студия: напрямую в media, ключ прибора заголовком X-Membrana-Token, путь /v1/devices', async () => {
    const seen = stubFetch();
    const backend = createServerStorageBackend({ baseUrl: 'https://media.test/', deviceId: DEVICE, mediaToken: 'device-client-key' });
    await backend.ensureReservedCollections();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe(`https://media.test/v1/devices/${DEVICE}/collections/ensure-reserved`);
    expect(seen[0]!.headers.get('X-Membrana-Token')).toBe('device-client-key');
    expect(seen[0]!.headers.get('Authorization')).toBeNull();
    expect(seen[0]!.headers.get('X-Membrana-Device-Id')).toBe(DEVICE);
  });

  it('кабинет: через сервер кабинета сессией пользователя; заголовка ключа media нет вовсе', async () => {
    const seen = stubFetch();
    let session = 'session-1';
    const backend = createServerStorageBackend({
      baseUrl: 'https://cabinet.test',
      deviceId: DEVICE,
      devicesPath: '/v1/media/devices/',
      requestHeaders: () => ({ Authorization: `Bearer ${session}` }),
    });
    await backend.ensureReservedCollections();
    session = 'session-2';
    await backend.ensureReservedCollections();
    expect(seen.map((s) => s.url)).toEqual([
      `https://cabinet.test/v1/media/devices/${DEVICE}/collections/ensure-reserved`,
      `https://cabinet.test/v1/media/devices/${DEVICE}/collections/ensure-reserved`,
    ]);
    expect(seen.map((s) => s.headers.get('Authorization'))).toEqual(['Bearer session-1', 'Bearer session-2']);
    for (const s of seen) expect(s.headers.get('X-Membrana-Token')).toBeNull();
  });
});
