import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchMe, githubLoginHref, redeemInvite, registerWithPromo } from './authApi';

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
  it('fetchMe: валидный ответ → identity (с грантами PU2); не-ok/мусорная роль → public', async () => {
    mockFetchSequence([{ status: 200, body: { role: 'ally', sub: 'invite:x' } }]);
    expect(await fetchMe()).toEqual({ role: 'ally', sub: 'invite:x', grants: [] });

    mockFetchSequence([{ status: 200, body: { role: 'ally', sub: 'user:u1', grants: ['*', 7, 'x'] } }]);
    // Не-строки в grants отбрасываются защитным парсом.
    expect(await fetchMe()).toEqual({ role: 'ally', sub: 'user:u1', grants: ['*', 'x'] });

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

  it('registerWithPromo (PU2): контракт /v1/panel/register, ошибки словами, успех → /me', async () => {
    mockFetchSequence([{ status: 403, body: { message: 'code was not accepted' } }]);
    await expect(registerWithPromo('BAD', 'Пётр')).rejects.toThrow('Код не подошёл');

    mockFetchSequence([{ status: 429, body: {} }]);
    await expect(registerWithPromo('X', 'Пётр')).rejects.toThrow('Слишком много попыток');

    const fn = mockFetchSequence([
      { status: 201, body: { ok: true, role: 'ally', name: 'Пётр', grants: ['*'] } },
      { status: 200, body: { role: 'ally', sub: 'user:u1', grants: ['*'] } },
    ]);
    expect(await registerWithPromo('GOODCODE00000000', 'Пётр')).toEqual({
      role: 'ally',
      sub: 'user:u1',
      grants: ['*'],
    });
    const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/v1/panel/register');
    expect(init.credentials).toBe('include');
    expect(JSON.parse(String(init.body))).toEqual({ code: 'GOODCODE00000000', name: 'Пётр' });
  });

  it('githubLoginHref — относительный /v1-путь (прод и дев одинаковы)', () => {
    expect(githubLoginHref()).toBe('/v1/panel/auth/github');
  });
});
