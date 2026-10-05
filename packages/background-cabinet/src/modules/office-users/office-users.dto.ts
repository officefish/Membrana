/**
 * Форма служебной двери кабинета для office (#2588 b2; ADR-0031 п.3 — scope v1 узкий).
 *
 * Office видит о пользователе кабинета РОВНО это: идентификаторы, имя входа как ярлык, тариф,
 * срок архива и дату регистрации. Ни пароля, ни сессий, ни проб, ни адресов — минимум полей
 * вердикта консилиума; расширение формы — только новым ADR.
 */
import type { RetentionDays } from '../../domain/archive-retention';

/** Пользователь мембраны глазами office. `displayLabel` = login (решение владельца 05.10). */
export interface OfficeMembraneItem {
  readonly membraneId: string;
  readonly userId: string;
  readonly displayLabel: string;
  readonly tariffId: string;
  readonly retentionDays: RetentionDays;
  /** Строки срока нет — действует умолчание 14. */
  readonly isDefault: boolean;
  readonly createdAt: string;
}

export interface OfficeMembranesPage {
  readonly items: readonly OfficeMembraneItem[];
  /** `null`, когда страница последняя. Значение — `membraneId` последнего элемента. */
  readonly nextCursor: string | null;
}

/** Тело `PUT :membraneId/archive-retention`. `actor` — след владельца панели (panelIdentity.sub). */
export interface SetArchiveRetentionDto {
  readonly days?: unknown;
  readonly actor?: unknown;
}

export interface SetArchiveRetentionResult {
  readonly membraneId: string;
  readonly retentionDays: RetentionDays;
  readonly isDefault: false;
  readonly updatedAt: string;
  readonly updatedBy: string;
}

/** Умолчание и потолок страницы: панели владельца хватает; media/проб тут нет, страница дешёвая. */
export const OFFICE_MEMBRANES_DEFAULT_LIMIT = 50;
export const OFFICE_MEMBRANES_MAX_LIMIT = 200;

/** След актёра, если office его не прислал: дверь служебная, пустым `updatedBy` быть не должен. */
export const OFFICE_ACTOR_FALLBACK = 'service:office';
export const OFFICE_ACTOR_MAX_LENGTH = 128;

/** Закрытый список кодов отказа двери — читается office, в браузер не выносится. */
export const OFFICE_USERS_REFUSALS = ['invalid_retention_days', 'membrane_not_found', 'invalid_cursor', 'invalid_limit'] as const;
export type OfficeUsersRefusal = (typeof OFFICE_USERS_REFUSALS)[number];
