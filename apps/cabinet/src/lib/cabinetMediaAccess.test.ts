import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTrackKeyTtl, writeTrackKeyTtl } from '@/api/sampleLibrary';
import { fetchDeviceScenarioRecord } from '@/lib/cabinetDeviceScenario';
import { cabinetDeviceUrl, cabinetSessionHeaders } from '@/lib/cabinetMediaAccess';
import { getCabinetMediaLibrary, resetCabinetMediaSession } from '@/lib/cabinetMediaLibrary';

/**
 * Браузер кабинета ходит в библиотеку прибора через сервер кабинета сессией пользователя:
 * адрес — `/api/v1/media/devices/:deviceId/...`, заголовок — `Authorization`, заголовка ключа
 * media нет ни у одного из трёх потребителей.
 */

const DEVICE = '11111111-2222-4333-8444-555555555555';

interface Seen {
  url: string;
  headers: Headers;
}

let seen: Seen[] = [];
let store: Record<string, string> = {};

beforeEach(() => {
  seen = [];
  store = { 'membrana.cabinet.sessionToken': 'session-abc' };
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      seen.push({ url: u, headers: new Headers(init?.headers) });
      if (u.endsWith('/v1/media/session')) {
        return Response.json({
          mediaApiUrl: 'https://media.test',
          membraneId: 'm-1',
          catalogId: 'free-v1-catalog',
          devices: [{ nodeId: 'n-1', nodeLabel: 'A', deviceId: DEVICE }],
        });
      }
      if (u.endsWith('/device-scenario')) return new Response('', { status: 404 });
      if (u.endsWith('/track-key-ttl')) {
        return Response.json({ stored: null, effective: { seconds: 60, source: 'default' }, defaultSeconds: 60, maxSeconds: 600, scopeCaveat: '' });
      }
      if (u.endsWith('/quota')) {
        return Response.json({
          userStorage: { usedBytes: 0, limitBytes: 1, backend: 'server' },
          buffer: { usedBytes: 0, limitBytes: 1, backend: 'server' },
          dataset: { catalogId: 'free-v1-catalog', sampleCount: 0 },
        });
      }
      return Response.json([]);
    }),
  );
});

afterEach(() => {
  resetCabinetMediaSession();
  vi.unstubAllGlobals();
});

function libraryCalls(): Seen[] {
  return seen.filter((s) => !s.url.endsWith('/v1/media/session'));
}

describe('доступ кабинета к библиотеке прибора', () => {
  it('адрес — дверь кабинета, заголовки — сессия пользователя', () => {
    expect(cabinetDeviceUrl(DEVICE, '/quota')).toBe(`/api/v1/media/devices/${DEVICE}/quota`);
    expect(cabinetSessionHeaders()).toEqual({ Authorization: 'Bearer session-abc' });
    store = {};
    expect(cabinetSessionHeaders()).toEqual({});
  });

  it('сценарий доски — через кабинет, без ключа media', async () => {
    await expect(fetchDeviceScenarioRecord(DEVICE)).resolves.toBeNull();
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe(`/api/v1/media/devices/${DEVICE}/device-scenario`);
    expect(seen[0]!.headers.get('Authorization')).toBe('Bearer session-abc');
    expect(seen[0]!.headers.get('X-Membrana-Token')).toBeNull();
  });

  it('срок ключей треков — через кабинет, без ключа media', async () => {
    await fetchTrackKeyTtl(DEVICE);
    await writeTrackKeyTtl(DEVICE, { mode: 'default' });
    expect(seen.map((s) => s.url)).toEqual([
      `/api/v1/media/devices/${DEVICE}/track-key-ttl`,
      `/api/v1/media/devices/${DEVICE}/track-key-ttl`,
    ]);
    for (const s of seen) {
      expect(s.headers.get('Authorization')).toBe('Bearer session-abc');
      expect(s.headers.get('X-Membrana-Token')).toBeNull();
    }
  });

  it('библиотека — через кабинет, без ключа media и без обращений к адресу media', async () => {
    await getCabinetMediaLibrary(DEVICE);
    const calls = libraryCalls();
    expect(calls.length).toBeGreaterThan(0);
    for (const s of calls) {
      expect(s.url.startsWith(`/api/v1/media/devices/${DEVICE}/`)).toBe(true);
      expect(s.headers.get('Authorization')).toBe('Bearer session-abc');
      expect(s.headers.get('X-Membrana-Token')).toBeNull();
    }
    expect(seen.some((s) => s.url.includes('media.test'))).toBe(false);
  });
});
