import type { PanelRole } from './panel-auth-core';

/**
 * Реестр секций, отдаваемых маршрут-мостом панели (`/panel/section/<id>/*`) —
 * server source of truth (консилиум graphify-research-tree-panel-sections-2026-07-16:
 * «единственный арбитр доступа — гейт панели; reverse_proxy лишь исполняет вердикт»).
 *
 * Caddy делает `forward_auth` на `/v1/panel/gate/<id>`; office здесь решает, кто
 * вправе. Роли в конфиге прокси нет — только здесь.
 *
 * GRP2/GRP3: оба — грант-гейт (`minRole: operator` → техпартнёр `ally + grant:graphify`
 * / инвестор `ally + grant:research-tree` видит; плейн-ally нет; operator+/owner по
 * роли). git-time-travel research-tree — офлайн (данные в статическом JSON блока),
 * прод-git рантаймом не трогается (консилиум).
 */
export interface BridgeGatedSection {
  /** Минимальная роль; owner-разделы грантами не открываются (canAccessSection). */
  minRole: PanelRole;
}

export const BRIDGE_GATED_SECTIONS: Readonly<Record<string, BridgeGatedSection>> = {
  graphify: { minRole: 'operator' },
  'research-tree': { minRole: 'operator' },
};
