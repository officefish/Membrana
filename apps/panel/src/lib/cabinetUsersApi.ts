import { apiPath } from './appMeta';

/**
 * #2588 b4: клиент ручек «Пользователи кабинета» панели (office → дверь кабинета, PR #2596).
 * Контракт — инвентарный зуб office (`cabinet-users.controller.test.ts`): ровно две ручки,
 * обе только владельцу (не-owner → 404). Логики списка здесь нет: страница и строка после
 * PUT — ответ кабинета как есть. Исходы office различаются КОДОМ тела, не только статусом:
 * 503 `cabinet_not_configured` — связь не настроена (баннер, правка недоступна), остальное —
 * ошибка в строке с откатом значения.
 */

export interface CabinetUserRow {
  membraneId: string;
  userId: string;
  /** login пользователя кабинета (решение владельца 05.10). */
  displayLabel: string;
  tariffId: string;
  retentionDays: number;
  /** Строки срока в кабинете нет — действует умолчание 14. */
  isDefault: boolean;
  createdAt: string;
}

export interface CabinetUsersPage {
  items: CabinetUserRow[];
  nextCursor: string | null;
}

export interface CabinetRetentionResult {
  membraneId: string;
  retentionDays: number;
  isDefault: boolean;
  updatedAt: string;
  updatedBy: string;
}

/** Закрытый список сроков — тот же, что `RETENTION_DAYS` домена кабинета (ADR-0031 п.4). */
export const RETENTION_OPTIONS = [1, 7, 14, 30, 90] as const;
export type RetentionOption = (typeof RETENTION_OPTIONS)[number];
export const DEFAULT_RETENTION_DAYS: RetentionOption = 14;
export const TEST_RETENTION_DAYS: RetentionOption = 1;

/** Подпись пункта списка: «14 — по умолчанию», «1 — для проверок», прочие — число и слово «дней». */
export function retentionOptionLabel(days: RetentionOption): string {
  if (days === DEFAULT_RETENTION_DAYS) return `${days} — по умолчанию`;
  if (days === TEST_RETENTION_DAYS) return `${days} — для проверок`;
  return `${days} дней`;
}

export function isRetentionOption(value: unknown): value is RetentionOption {
  return typeof value === 'number' && (RETENTION_OPTIONS as readonly number[]).includes(value);
}

/** Код отказа, которым office различает «связь не настроена» от прочих ошибок. */
export const CABINET_NOT_CONFIGURED_CODE = 'cabinet_not_configured';

export class CabinetUsersApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
  ) {
    super(message);
    this.name = 'CabinetUsersApiError';
  }

  get notConfigured(): boolean {
    return this.status === 503 && this.code === CABINET_NOT_CONFIGURED_CODE;
  }
}

/** Человеческая фраза по статусу и коду office — без внутренних имён переменных. */
export function describeCabinetError(status: number, code: string | null): string {
  if (status === 503 && code === CABINET_NOT_CONFIGURED_CODE) return 'Связь с кабинетом не настроена.';
  if (status === 404 && code === 'membrane_not_found') return 'Такой мембраны в кабинете уже нет.';
  if (status === 400 && code === 'invalid_retention_days') return 'Кабинет не принял этот срок.';
  if (status === 404) return 'Раздел доступен только владельцу — войдите заново.';
  if (status === 502) return 'Кабинет не отвечает — попробуйте позже.';
  return `Запрос не прошёл (HTTP ${status}) — попробуйте ещё раз.`;
}

async function cabinetFetch(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(apiPath(path), { credentials: 'include', ...init });
  if (!res.ok) {
    let code: string | null = null;
    try {
      const body = (await res.json()) as { code?: unknown };
      code = typeof body?.code === 'string' ? body.code : null;
    } catch {
      code = null;
    }
    throw new CabinetUsersApiError(res.status, code, describeCabinetError(res.status, code));
  }
  return res.json();
}

export async function fetchCabinetUsers(cursor?: string | null, limit?: number): Promise<CabinetUsersPage> {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const raw = (await cabinetFetch(`panel/admin/cabinet-users${qs ? `?${qs}` : ''}`)) as {
    items?: CabinetUserRow[];
    nextCursor?: string | null;
  };
  return {
    items: Array.isArray(raw.items) ? raw.items : [],
    nextCursor: typeof raw.nextCursor === 'string' ? raw.nextCursor : null,
  };
}

export async function setCabinetRetention(membraneId: string, days: RetentionOption): Promise<CabinetRetentionResult> {
  return (await cabinetFetch(`panel/admin/cabinet-users/${encodeURIComponent(membraneId)}/archive-retention`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ days }),
  })) as CabinetRetentionResult;
}

// ─── чистые хелперы строк (тестируются без DOM) ───────────────────────────────────

/** Строка после ответа кабинета: срок и признак умолчания — из ответа, остальное как было. */
export function applyRetentionResult(rows: readonly CabinetUserRow[], result: CabinetRetentionResult): CabinetUserRow[] {
  return rows.map((r) =>
    r.membraneId === result.membraneId ? { ...r, retentionDays: result.retentionDays, isDefault: result.isDefault } : r,
  );
}

/** Оптимистичное значение до ответа; откат — просто вернуть прежний массив строк. */
export function withOptimisticRetention(rows: readonly CabinetUserRow[], membraneId: string, days: RetentionOption): CabinetUserRow[] {
  return rows.map((r) => (r.membraneId === membraneId ? { ...r, retentionDays: days, isDefault: false } : r));
}

/** Дата регистрации коротко; неразборчивая строка — как есть. */
export function formatCreatedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('ru-RU');
}
