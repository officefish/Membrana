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

/** Человеческие подписи уровней (язык ALLY_PRIMER — без жаргона). */
export const ROLE_LABELS: Record<PanelRole, string> = {
  public: 'для всех',
  ally: 'союзник',
  operator: 'оператор',
  owner: 'владелец',
};
