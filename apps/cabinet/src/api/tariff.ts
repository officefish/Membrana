/**
 * Погашение промокода — клиент ручки `POST v1/membranes/me/tariff/promo-redemptions`
 * (блок b2 спринта `tariff-promo-server-wiring`, #1761).
 *
 * Типы — FOLLOWER серверного контракта (`TransitionOutcome` контроллера тарифа;
 * конвенция follower-типов кабинета, образец `TariffView`). Дом истины о причинах —
 * сервер; новые причины здесь НЕ выдумываются, неизвестная строка честно доезжает
 * до словаря `promoDenyText` и показывается fallback-веткой.
 */
import { getApiBase } from './auth';

/** Закрытый список причин отказа сервера — follower, 1:1 с доменом + сервисом. */
export const PROMO_DENY_REASONS = [
  'unknown_target_tariff',
  'same_tariff',
  'promo_downgrade_forbidden',
  'promo_already_redeemed',
  'promo_revoked',
  'promo_expired',
  'promo_target_mismatch',
  'promo_not_single_use',
  'promo_unknown',
  'membrane_unknown',
  'grid_unavailable',
  'tariff_moved_concurrently',
] as const;

export type PromoDenyReason = (typeof PROMO_DENY_REASONS)[number];

export type RedeemPromoOutcome =
  | { ok: true; fromTariffId: string; toTariffId: string }
  /** `reason` типизирован строкой сознательно: рассинхрон с сервером — не наш краш. */
  | { ok: false; reason: PromoDenyReason | (string & Record<never, never>) };

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('membrana.cabinet.sessionToken');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${getApiBase()}${path}`, { ...init, headers });
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    const msg = Array.isArray(body.message) ? body.message.join('; ') : body.message;
    return msg || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

/** Транспортные ошибки (400/401/5xx) — throw; доменный исход (ok|reason) — возврат. */
export async function redeemPromoCode(code: string): Promise<RedeemPromoOutcome> {
  const res = await authFetch('/v1/membranes/me/tariff/promo-redemptions', {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as RedeemPromoOutcome;
}
