import { apiPath } from './appMeta';
import { isPanelRole, type PanelRole } from './roles';

/**
 * HTTP-клиент auth-ручек office (OP2). Только относительные /v1-пути и
 * credentials: 'include' — сессия живёт в httpOnly cookie, JS её не видит
 * и не хранит (консилиум: НЕ localStorage).
 */

export interface PanelIdentity {
  role: PanelRole;
  sub: string | null;
  /** PU2 (#463): гранты партнёра на разделы ('*' = все); [] у остальных. */
  grants: string[];
}

export const PUBLIC_IDENTITY: PanelIdentity = { role: 'public', sub: null, grants: [] };

function asIdentity(raw: unknown): PanelIdentity {
  const role = (raw as { role?: unknown })?.role;
  const sub = (raw as { sub?: unknown })?.sub;
  const grants = (raw as { grants?: unknown })?.grants;
  if (!isPanelRole(role)) return PUBLIC_IDENTITY;
  return {
    role,
    sub: typeof sub === 'string' ? sub : null,
    grants: Array.isArray(grants) ? grants.filter((g): g is string => typeof g === 'string') : [],
  };
}

export async function fetchMe(): Promise<PanelIdentity> {
  const res = await fetch(apiPath('panel/auth/me'), { credentials: 'include' });
  if (!res.ok) return PUBLIC_IDENTITY;
  return asIdentity(await res.json());
}

/** Вход по invite-коду. Бросает Error с человеческим текстом при отказе. */
export async function redeemInvite(code: string): Promise<PanelIdentity> {
  const res = await fetch(apiPath('panel/auth/invite'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (res.status === 403) throw new Error('Код не подошёл или истёк — попросите новый.');
  if (res.status === 503) throw new Error('Вход пока не настроен на сервере.');
  if (!res.ok) throw new Error('Не получилось войти — попробуйте ещё раз.');
  return fetchMe();
}

/**
 * PU2 (#463): регистрация партнёра по промокоду. Сервер отвечает одной
 * формулировкой на все причины отказа (Q3) — переводим её человеческим текстом.
 */
export async function registerWithPromo(code: string, name: string): Promise<PanelIdentity> {
  const res = await fetch(apiPath('panel/register'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, name }),
  });
  if (res.status === 403) throw new Error('Код не подошёл — проверьте его или попросите новый.');
  if (res.status === 429) throw new Error('Слишком много попыток — подождите час.');
  if (res.status === 503) throw new Error('Регистрация пока не настроена на сервере.');
  if (!res.ok) throw new Error('Не получилось зарегистрироваться — попробуйте ещё раз.');
  return fetchMe();
}

export async function logout(): Promise<void> {
  await fetch(apiPath('panel/auth/logout'), { method: 'POST', credentials: 'include' });
}

/** Ссылка входа через GitHub (operator/owner) — обычная навигация, не fetch. */
export function githubLoginHref(): string {
  return apiPath('panel/auth/github');
}
