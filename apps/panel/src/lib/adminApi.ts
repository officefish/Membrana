import { apiPath } from './appMeta';

/**
 * PU3 (#463): клиент admin-ручек panel-users (owner-раздел «Пользователи»).
 * Контракт — инвентарный тест PU1 (panel-users.inventory.test.ts в office).
 * Не-owner получает 404 — раздел не рендерится без owner-роли, но 404
 * обрабатываем честно (сессия могла протухнуть).
 */

export interface AdminUser {
  id: string;
  name: string;
  grants: string[];
  permVersion: number;
  revoked: boolean;
  createdAt: string;
  codeLabel: string | null;
}

export interface AdminAuditEntry {
  at: string;
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface AdminPromoCode {
  id: string;
  codePrefix: string;
  label: string;
  grants: string[];
  expiresAt: number | null;
  maxUses: number;
  usedCount: number;
  revoked: boolean;
  createdAt: string;
}

export interface MintedCode {
  id: string;
  /** Полный код — приходит ЕДИНСТВЕННЫЙ раз, повторно не показывается. */
  code: string;
  label: string;
  grants: string[];
}

async function adminFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(apiPath(path), { credentials: 'include', ...init });
  if (res.status === 404) throw new Error('Раздел доступен только владельцу — войдите заново.');
  if (!res.ok) throw new Error(`Запрос не прошёл (HTTP ${res.status}) — попробуйте ещё раз.`);
  return res.json();
}

export async function fetchAdminUsers(): Promise<{
  degraded: boolean;
  users: AdminUser[];
  audit: AdminAuditEntry[];
}> {
  const raw = (await adminFetch('panel/admin/users')) as {
    degraded?: boolean;
    users?: AdminUser[];
    audit?: AdminAuditEntry[];
  };
  return {
    degraded: raw.degraded === true,
    users: Array.isArray(raw.users) ? raw.users : [],
    audit: Array.isArray(raw.audit) ? raw.audit : [],
  };
}

export async function fetchAdminCodes(): Promise<AdminPromoCode[]> {
  const raw = (await adminFetch('panel/admin/promo-codes')) as { codes?: AdminPromoCode[] };
  return Array.isArray(raw.codes) ? raw.codes : [];
}

export async function patchUserGrants(userId: string, grants: string[]): Promise<void> {
  await adminFetch(`panel/admin/users/${encodeURIComponent(userId)}/grants`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ grants }),
  });
}

export async function revokeUser(userId: string): Promise<void> {
  await adminFetch(`panel/admin/users/${encodeURIComponent(userId)}/revoke`, { method: 'POST' });
}

export async function mintPromoCode(input: {
  label: string;
  grants: string[];
  days: number;
  maxUses: number;
}): Promise<MintedCode> {
  return (await adminFetch('panel/admin/promo-codes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })) as MintedCode;
}

export async function revokePromoCode(codeId: string): Promise<void> {
  await adminFetch(`panel/admin/promo-codes/${encodeURIComponent(codeId)}/revoke`, {
    method: 'POST',
  });
}

// ─── чистые хелперы матрицы (консилиум Р5: три состояния ячейки) ────────────────────

export type GrantCellState = 'granted' | 'none' | 'wildcard';

/** Состояние ячейки «пользователь × раздел»: явный грант / нет / покрыто '*'. */
export function grantCellState(grants: readonly string[], sectionId: string): GrantCellState {
  if (grants.includes(sectionId)) return 'granted';
  if (grants.includes('*')) return 'wildcard';
  return 'none';
}

/**
 * Следующий набор грантов после клика по ячейке. Wildcard-ячейку нельзя снять
 * напрямую — сперва «развернуть *» в явный список (expandWildcard).
 */
export function toggleGrant(grants: readonly string[], sectionId: string): string[] {
  if (grants.includes(sectionId)) return grants.filter((g) => g !== sectionId);
  return [...grants, sectionId];
}

/** Разворачивает '*' в явный список текущих разделов (клик «развернуть *»). */
export function expandWildcard(
  grants: readonly string[],
  allSectionIds: readonly string[],
): string[] {
  if (!grants.includes('*')) return [...grants];
  const explicit = grants.filter((g) => g !== '*');
  for (const id of allSectionIds) {
    if (!explicit.includes(id)) explicit.push(id);
  }
  return explicit;
}

/** «14.07 18:02 owner снял … у Petrov» — аудит-строка читаемым текстом. */
export function formatAuditEntry(entry: AdminAuditEntry): string {
  const at = new Date(entry.at);
  const stamp = Number.isNaN(at.getTime())
    ? entry.at
    : at.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  const action =
    {
      register: 'регистрация',
      grants: 'изменение доступа',
      'revoke-user': 'отзыв пользователя',
      'mint-code': 'новый промокод',
      'revoke-code': 'отзыв промокода',
    }[entry.action] ?? entry.action;
  return `${stamp} · ${action} · ${entry.detail || entry.target} (${entry.actor})`;
}
