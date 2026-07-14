import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMe, githubLoginHref, redeemInvite } from './authApi';

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  const queue = [...responses];
  const fn = vi.fn(async () => {
    const next = queue.shift() ?? { status: 500, body: {} };
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      json: async () => next.body,
    };
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('authApi (контракт ручек OP2)', () => {
  it('fetchMe: валидный ответ → identity; не-ok/мусорная роль → public', async () => {
    mockFetchSequence([{ status: 200, body: { role: 'ally', sub: 'invite:x' } }]);
    expect(await fetchMe()).toEqual({ role: 'ally', sub: 'invite:x' });

    mockFetchSequence([{ status: 500, body: {} }]);
    expect((await fetchMe()).role).toBe('public');

    mockFetchSequence([{ status: 200, body: { role: 'root' } }]);
    expect((await fetchMe()).role).toBe('public');
  });

  it('fetchMe ходит с credentials: include (cookie-сессия, не localStorage)', async () => {
    const fn = mockFetchSequence([{ status: 200, body: { role: 'public', sub: null } }]);
    await fetchMe();
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/v1/panel/auth/me');
    expect(init.credentials).toBe('include');
  });

  it('redeemInvite: 403 → человеческая ошибка; успех → повторный /me', async () => {
    mockFetchSequence([{ status: 403, body: {} }]);
    await expect(redeemInvite('bad')).rejects.toThrow('Код не подошёл');

    const fn = mockFetchSequence([
      { status: 201, body: { ok: true, role: 'ally' } },
      { status: 200, body: { role: 'ally', sub: 'invite:x' } },
    ]);
    expect((await redeemInvite('good')).role).toBe('ally');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('githubLoginHref — относительный /v1-путь (прод и дев одинаковы)', () => {
    expect(githubLoginHref()).toBe('/v1/panel/auth/github');
  });
});
