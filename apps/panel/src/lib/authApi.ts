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
}

export const PUBLIC_IDENTITY: PanelIdentity = { role: 'public', sub: null };

function asIdentity(raw: unknown): PanelIdentity {
  const role = (raw as { role?: unknown })?.role;
  const sub = (raw as { sub?: unknown })?.sub;
  if (!isPanelRole(role)) return PUBLIC_IDENTITY;
  return { role, sub: typeof sub === 'string' ? sub : null };
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

export async function logout(): Promise<void> {
  await fetch(apiPath('panel/auth/logout'), { method: 'POST', credentials: 'include' });
}

/** Ссылка входа через GitHub (operator/owner) — обычная навигация, не fetch. */
export function githubLoginHref(): string {
  return apiPath('panel/auth/github');
}
