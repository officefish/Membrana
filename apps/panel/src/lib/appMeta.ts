/**
 * Мета панели (OP1). Welcome-контент и уровни доступа — НЕ здесь:
 * welcome/shell — OP3 (rodchenko), предикат canAccess и роли — OP2 (dynin).
 */

export const PANEL_TITLE = 'Membrana — панель';

/**
 * База API office. Прод: Caddy на panel.mmbrn.tech проксирует `/v1/*` → office;
 * дев: vite-proxy делает то же (vite.config.ts). Абсолютные URL не хардкодим —
 * панель всегда ходит относительным путём.
 */
export function apiBase(): string {
  return '/v1';
}

/** Собрать путь API-ручки office: apiPath('drift-anchor/digest') → '/v1/drift-anchor/digest'. */
export function apiPath(endpoint: string): string {
  const clean = endpoint.replace(/^\/+/, '');
  return `${apiBase()}/${clean}`;
}
