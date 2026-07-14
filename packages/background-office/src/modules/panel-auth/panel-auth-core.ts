/**
 * panel-auth-core — чистое ядро авторизации панели (OP2, эпик #438).
 *
 * Консилиум office-panel-contour (2026-07-14): office остаётся stateless
 * (ADR 0004 Р2) — НИКАКОГО хранилища сессий/учёток. Всё на подписанных
 * HMAC-токенах: invite-код союзника, session-cookie, OAuth-state. Полный
 * порядок ролей public < ally < operator < owner; предикат canAccess —
 * детерминированная функция, тестируется без БД и DOM.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export type PanelRole = 'public' | 'ally' | 'operator' | 'owner';

export const ROLE_ORDER: Record<PanelRole, number> = {
  public: 0,
  ally: 1,
  operator: 2,
  owner: 3,
};

export function isPanelRole(value: unknown): value is PanelRole {
  return typeof value === 'string' && value in ROLE_ORDER;
}

/** Предикат доступа: роль пользователя не ниже требуемой. */
export function canAccess(actual: PanelRole, required: PanelRole): boolean {
  return ROLE_ORDER[actual] >= ROLE_ORDER[required];
}

// ─── подписанные токены (base64url(payload).base64url(hmac)) ─────────────────────

function b64url(buf: Buffer): string {
  return buf.toString('base64url');
}

function hmac(secret: string, data: string): string {
  return b64url(createHmac('sha256', secret).update(data).digest());
}

export interface SignedPayload {
  kind: 'session' | 'invite' | 'state';
  role?: PanelRole;
  sub?: string;
  label?: string;
  /** PU1 (#463): снапшот грантов партнёра — id разделов, '*' = все. */
  grants?: string[];
  /** PU1: permVersion-эпоха прав; /me сверяет со store (ADR 0005). */
  pv?: number;
  /** unix-секунды истечения */
  exp: number;
}

export function signPayload(secret: string, payload: SignedPayload): string {
  const body = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${body}.${hmac(secret, body)}`;
}

/** Проверка подписи (timing-safe) и срока. Любая некорректность → null, без исключений. */
export function verifyPayload(secret: string, token: string, nowSec: number): SignedPayload | null {
  const parts = String(token ?? '').split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = hmac(secret, parts[0]);
  const a = Buffer.from(parts[1]);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload: SignedPayload;
  try {
    payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as SignedPayload;
  } catch {
    return null;
  }
  if (typeof payload?.exp !== 'number' || payload.exp <= nowSec) return null;
  return payload;
}

// ─── invite-коды союзников (роль ally, без хранилища) ─────────────────────────────

export function mintInviteCode(secret: string, label: string, expSec: number): string {
  return signPayload(secret, { kind: 'invite', role: 'ally', label, exp: expSec });
}

/** → { label } валидного ally-кода, иначе null. */
export function verifyInviteCode(secret: string, code: string, nowSec: number): { label: string } | null {
  const payload = verifyPayload(secret, code, nowSec);
  if (!payload || payload.kind !== 'invite' || payload.role !== 'ally') return null;
  return { label: payload.label ?? 'ally' };
}

// ─── session-cookie ───────────────────────────────────────────────────────────────

export const PANEL_SESSION_COOKIE = 'membrana_panel_session';

/** Единый TTL сессии (OP5: константа жила дублем в контроллере и сервисе — P2 ревью OP2). */
export const PANEL_SESSION_TTL_SEC = 30 * 24 * 60 * 60;

export function mintSessionToken(secret: string, role: PanelRole, sub: string, expSec: number): string {
  return signPayload(secret, { kind: 'session', role, sub, exp: expSec });
}

/** PU1 (#463): сессия зарегистрированного партнёра — ally + снапшот грантов + эпоха. */
export function mintPartnerSessionToken(
  secret: string,
  sub: string,
  grants: readonly string[],
  permVersion: number,
  expSec: number,
): string {
  return signPayload(secret, {
    kind: 'session',
    role: 'ally',
    sub,
    grants: [...grants],
    pv: permVersion,
    exp: expSec,
  });
}

export interface PanelIdentity {
  role: PanelRole;
  sub: string | null;
  /** Снапшот грантов из cookie (кэш отображения; истина — store, ADR 0005). */
  grants?: string[];
  /** Эпоха прав из cookie; undefined = не партнёрская сессия. */
  pv?: number;
}

export const PUBLIC_IDENTITY: PanelIdentity = { role: 'public', sub: null };

/** Разбор заголовка Cookie (без cookie-parser — зависимость не нужна). */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of String(header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

/** Роль из запроса: нет/битая/просроченная cookie → public (никогда не бросает). */
export function resolveIdentity(
  cookieHeader: string | undefined,
  secret: string,
  nowSec: number,
): PanelIdentity {
  const token = parseCookies(cookieHeader)[PANEL_SESSION_COOKIE];
  if (!token) return PUBLIC_IDENTITY;
  const payload = verifyPayload(secret, token, nowSec);
  if (!payload || payload.kind !== 'session' || !isPanelRole(payload.role)) return PUBLIC_IDENTITY;
  return {
    role: payload.role,
    sub: payload.sub ?? null,
    grants: Array.isArray(payload.grants) ? payload.grants.filter((g) => typeof g === 'string') : undefined,
    pv: typeof payload.pv === 'number' ? payload.pv : undefined,
  };
}

/** Set-Cookie строка: httpOnly + SameSite (консилиум: НЕ localStorage; лёгкий CSRF для read-only). */
export function sessionCookieString(token: string, maxAgeSec: number, secure: boolean): string {
  const attrs = [
    `${PANEL_SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

export function clearSessionCookieString(secure: boolean): string {
  const attrs = [`${PANEL_SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (secure) attrs.push('Secure');
  return attrs.join('; ');
}

// ─── allowlist операторов/владельца (файл/env, БЕЗ БД) ────────────────────────────

/**
 * JSON вида {"github_user_id":"operator","...":"owner"} → Map. Некорректный JSON
 * или роли вне operator/owner → пустая/отфильтрованная карта (никогда не бросает).
 */
export function parseAllowlist(jsonText: string | undefined): Map<string, PanelRole> {
  const map = new Map<string, PanelRole>();
  if (!jsonText?.trim()) return map;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return map;
  }
  if (!parsed || typeof parsed !== 'object') return map;
  for (const [id, role] of Object.entries(parsed as Record<string, unknown>)) {
    if (role === 'operator' || role === 'owner') map.set(String(id), role);
  }
  return map;
}

// ─── rate-limit: скользящее окно (OP5, Q3-чеклист) ────────────────────────────────

/**
 * Чистый in-memory лимитер: не персистентность (office остаётся stateless по
 * ADR 0004 — при рестарте окно обнуляется, это ок для anti-scraping, не биллинг).
 */
export interface RateLimiter {
  /** true = запрос разрешён; false = превышение окна. */
  hit(key: string, nowMs: number): boolean;
}

export function createSlidingWindowLimiter(maxPerWindow: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, number[]>();
  return {
    hit(key: string, nowMs: number): boolean {
      const cutoff = nowMs - windowMs;
      const prev = (buckets.get(key) ?? []).filter((t) => t > cutoff);
      if (prev.length >= maxPerWindow) {
        buckets.set(key, prev);
        return false;
      }
      prev.push(nowMs);
      buckets.set(key, prev);
      return true;
    },
  };
}

/**
 * Ключ клиента за реверс-прокси: первый адрес X-Forwarded-For (его ставит Caddy),
 * иначе адрес сокета. Panel-API всегда за Caddy — без XFF все были бы 127.0.0.1.
 */
export function clientKey(xffHeader: string | undefined, remoteAddr: string | undefined): string {
  const first = String(xffHeader ?? '')
    .split(',')[0]
    ?.trim();
  return first || remoteAddr || 'unknown';
}

// ─── GitHub OAuth (чистые части; HTTP — в сервисе) ────────────────────────────────

export function buildGithubAuthorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'read:user',
    allow_signup: 'false',
  });
  return `https://github.com/login/oauth/authorize?${p.toString()}`;
}
