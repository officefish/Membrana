import { describe, expect, it } from 'vitest';

import {
  buildGithubAuthorizeUrl,
  canAccess,
  clearSessionCookieString,
  isPanelRole,
  mintInviteCode,
  mintSessionToken,
  parseAllowlist,
  parseCookies,
  PANEL_SESSION_COOKIE,
  resolveIdentity,
  ROLE_ORDER,
  sessionCookieString,
  signPayload,
  verifyInviteCode,
  verifyPayload,
} from './panel-auth-core';

const NOW = 1_800_000_000;
const SECRET = 'test-secret';

describe('роли и предикат canAccess (полный порядок, консилиум OP2)', () => {
  it('порядок public < ally < operator < owner', () => {
    expect(ROLE_ORDER.public).toBeLessThan(ROLE_ORDER.ally);
    expect(ROLE_ORDER.ally).toBeLessThan(ROLE_ORDER.operator);
    expect(ROLE_ORDER.operator).toBeLessThan(ROLE_ORDER.owner);
  });

  it('canAccess: монотонный предикат role >= minRole', () => {
    expect(canAccess('public', 'public')).toBe(true);
    expect(canAccess('public', 'ally')).toBe(false);
    expect(canAccess('ally', 'ally')).toBe(true);
    expect(canAccess('ally', 'operator')).toBe(false);
    expect(canAccess('operator', 'ally')).toBe(true);
    expect(canAccess('owner', 'operator')).toBe(true);
  });

  it('isPanelRole отбрасывает мусор', () => {
    expect(isPanelRole('owner')).toBe(true);
    expect(isPanelRole('admin')).toBe(false);
    expect(isPanelRole(42)).toBe(false);
  });
});

describe('подписанные токены', () => {
  it('roundtrip: sign → verify', () => {
    const token = signPayload(SECRET, { kind: 'session', role: 'ally', sub: 'x', exp: NOW + 60 });
    expect(verifyPayload(SECRET, token, NOW)?.role).toBe('ally');
  });

  it('подделка подписи/чужой секрет/мусор → null', () => {
    const token = signPayload(SECRET, { kind: 'session', role: 'owner', sub: 'x', exp: NOW + 60 });
    expect(verifyPayload('other-secret', token, NOW)).toBe(null);
    expect(verifyPayload(SECRET, token.slice(0, -2) + 'zz', NOW)).toBe(null);
    expect(verifyPayload(SECRET, 'not-a-token', NOW)).toBe(null);
    expect(verifyPayload(SECRET, '', NOW)).toBe(null);
  });

  it('просроченный токен → null', () => {
    const token = signPayload(SECRET, { kind: 'session', role: 'ally', sub: 'x', exp: NOW - 1 });
    expect(verifyPayload(SECRET, token, NOW)).toBe(null);
  });
});

describe('invite-коды (ally, без хранилища)', () => {
  it('валидный код → label; просрочка/подделка → null', () => {
    const code = mintInviteCode(SECRET, 'druid-friend', NOW + 3600);
    expect(verifyInviteCode(SECRET, code, NOW)).toEqual({ label: 'druid-friend' });
    expect(verifyInviteCode(SECRET, code, NOW + 7200)).toBe(null);
    expect(verifyInviteCode('wrong', code, NOW)).toBe(null);
  });

  it('session-токен НЕ проходит как invite (kind-гейт)', () => {
    const session = mintSessionToken(SECRET, 'ally', 'x', NOW + 3600);
    expect(verifyInviteCode(SECRET, session, NOW)).toBe(null);
  });
});

describe('cookie и identity', () => {
  it('parseCookies: обычный заголовок', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' });
    expect(parseCookies(undefined)).toEqual({});
  });

  it('resolveIdentity: нет cookie → public; валидная → роль; битая → public', () => {
    expect(resolveIdentity(undefined, SECRET, NOW).role).toBe('public');
    const token = mintSessionToken(SECRET, 'operator', 'github:1:dev', NOW + 60);
    const identity = resolveIdentity(`${PANEL_SESSION_COOKIE}=${token}`, SECRET, NOW);
    expect(identity).toEqual({ role: 'operator', sub: 'github:1:dev' });
    expect(resolveIdentity(`${PANEL_SESSION_COOKIE}=garbage`, SECRET, NOW).role).toBe('public');
  });

  it('sessionCookieString: httpOnly + SameSite, Secure по флагу; clear гасит', () => {
    const cookie = sessionCookieString('tok', 60, true);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Secure');
    expect(sessionCookieString('tok', 60, false)).not.toContain('Secure');
    expect(clearSessionCookieString(true)).toContain('Max-Age=0');
  });
});

describe('rate-limit: скользящее окно + ключ клиента (OP5)', () => {
  it('лимит в окне; окно скользит; ключи независимы', async () => {
    const { createSlidingWindowLimiter } = await import('./panel-auth-core');
    const limiter = createSlidingWindowLimiter(2, 1000);
    expect(limiter.hit('a', 0)).toBe(true);
    expect(limiter.hit('a', 100)).toBe(true);
    expect(limiter.hit('a', 200)).toBe(false); // 3-й в окне
    expect(limiter.hit('b', 200)).toBe(true); // другой клиент не задет
    expect(limiter.hit('a', 1201)).toBe(true); // первый (t=0) выпал из окна
  });

  it('clientKey: первый XFF (его ставит Caddy), иначе адрес сокета', async () => {
    const { clientKey } = await import('./panel-auth-core');
    expect(clientKey('203.0.113.7, 10.0.0.1', '127.0.0.1')).toBe('203.0.113.7');
    expect(clientKey(undefined, '10.1.2.3')).toBe('10.1.2.3');
    expect(clientKey('', undefined)).toBe('unknown');
  });
});

describe('allowlist и authorize-url', () => {
  it('parseAllowlist: только operator/owner, мусор игнорируется, битый JSON → пусто', () => {
    const map = parseAllowlist('{"1":"owner","2":"operator","3":"ally","4":"root"}');
    expect(map.get('1')).toBe('owner');
    expect(map.get('2')).toBe('operator');
    expect(map.has('3')).toBe(false);
    expect(map.has('4')).toBe(false);
    expect(parseAllowlist('not json').size).toBe(0);
    expect(parseAllowlist(undefined).size).toBe(0);
  });

  it('buildGithubAuthorizeUrl: client_id/redirect/state/scope', () => {
    const url = new URL(buildGithubAuthorizeUrl('cid', 'https://p/cb', 'st'));
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe('https://p/cb');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.get('scope')).toBe('read:user');
  });
});
