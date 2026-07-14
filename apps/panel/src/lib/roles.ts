/**
 * Клиентское зеркало ролей панели (OP3). Источник истины — office
 * (panel-auth-core): сервер решает доступ; здесь порядок нужен только
 * для честного UI (бейджи уровней, замки на карточках).
 */

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

export function canAccess(actual: PanelRole, required: PanelRole): boolean {
  return ROLE_ORDER[actual] >= ROLE_ORDER[required];
}

/**
 * PU2 (#463): партнёрские гранты поверх лестницы ролей (консилиум
 * panel-promo-access Р1). '*' = все разделы, текущие и будущие. Источник
 * истины — office-store (ADR 0005); здесь — зеркало для честного UI.
 */
export function grantsAllowSection(
  grants: readonly string[] | undefined,
  sectionId: string,
): boolean {
  return Boolean(grants && (grants.includes('*') || grants.includes(sectionId)));
}

/** Единый предикат видимости раздела: роль ≥ minRole ИЛИ грант на раздел. */
export function canAccessSection(
  role: PanelRole,
  grants: readonly string[] | undefined,
  minRole: PanelRole,
  sectionId: string,
): boolean {
  return canAccess(role, minRole) || grantsAllowSection(grants, sectionId);
}

/** Человеческие подписи уровней (язык ALLY_PRIMER — без жаргона). */
export const ROLE_LABELS: Record<PanelRole, string> = {
  public: 'для всех',
  ally: 'союзник',
  operator: 'оператор',
  owner: 'владелец',
};
