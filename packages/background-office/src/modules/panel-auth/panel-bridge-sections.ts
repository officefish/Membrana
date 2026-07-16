import type { PanelRole } from './panel-auth-core';

/**
 * Реестр секций, отдаваемых маршрут-мостом панели (`/panel/section/<id>/*`) —
 * server source of truth (консилиум graphify-research-tree-panel-sections-2026-07-16:
 * «единственный арбитр доступа — гейт панели; reverse_proxy лишь исполняет вердикт»).
 *
 * Caddy делает `forward_auth` на `/v1/panel/gate/<id>`; office здесь решает, кто
 * вправе. Роли в конфиге прокси нет — только здесь.
 *
 * GRP1: graphify — owner-only (admin preview). GRP2 понизит до грант-гейта
 * (`grant:graphify` техпартнёрам) и добавит `research-tree` (`grant:research-tree`).
 */
export interface BridgeGatedSection {
  /** Минимальная роль; owner-разделы грантами не открываются (canAccessSection). */
  minRole: PanelRole;
}

export const BRIDGE_GATED_SECTIONS: Readonly<Record<string, BridgeGatedSection>> = {
  graphify: { minRole: 'owner' },
};
