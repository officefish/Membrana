/**
 * Клиент ручек смены тарифа: погашение промокода (#1761) и СОБСТВЕННЫЙ ВЫБОР (#2281).
 *
 * Обе дороги ведут к одному переходу на сервере и делят один закрытый список причин — поэтому
 * список здесь ОДИН. Развести их на два значило бы завести второй словарь отказов о том же
 * событии; расхождение копий тогда стало бы вопросом времени.
 *
 * Типы — FOLLOWER серверного контракта (`TransitionOutcome` контроллера тарифа;
 * конвенция follower-типов кабинета, образец `TariffView`). Дом истины о причинах —
 * сервер; новые причины здесь НЕ выдумываются, неизвестная строка честно доезжает
 * до словаря `promoDenyText` и показывается fallback-веткой.
 */
import { getApiBase } from './auth';

/**
 * Закрытый список причин отказа сервера — follower, 1:1 с доменом + сервисом.
 *
 * Имя было `PROMO_DENY_REASONS`, пока дорога была одна. С #2281 тот же список отвечает и за
 * собственный выбор, и «promo» в имени стало бы неправдой о содержимом.
 */
export const TARIFF_DENY_REASONS = [
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
  /** #2281: ворота собственного выбора закрыты. Сегодня сервер её не шлёт — ворота открыты. */
  'self_gate_closed',
  /** #2587 b4b: понижение с избытком без подтверждённого предпросмотра — ответ несёт предпросмотр. */
  'preview_required',
  /** #2587 b4b: сервер записей не заморозил избыток — тариф не коммитится. */
  'freeze_failed',
  /** #2587 b4b: сервер записей недоступен на предпросмотре. */
  'media_unavailable',
] as const;

export type TariffDenyReason = (typeof TARIFF_DENY_REASONS)[number];

export type RedeemPromoOutcome =
  | { ok: true; fromTariffId: string; toTariffId: string }
  /** `reason` типизирован строкой сознательно: рассинхрон с сервером — не наш краш. */
  | { ok: false; reason: TariffDenyReason | (string & Record<never, never>) };

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

/** Строка витрины тарифов — follower `TariffCatalogItem` сервера (#2281). */
export interface TariffCatalogItem {
  id: string;
  name: string;
  rank: number;
  current: boolean;
  userStorageQuotaBytes: string;
  bufferQuotaBytes: string;
  maxNodesPerMembrane: number;
  maxUserWorkspaces: number;
}

export interface TariffCatalogView {
  currentTariffId: string;
  items: TariffCatalogItem[];
}

/**
 * Счёт разноски нового предела по приборам мембраны.
 *
 * Показывается пользователю, а не логируется: «тариф сменён, но до одного прибора предел не
 * доехал» — состояние, о котором он обязан знать. Молчание здесь означало бы новый тариф на
 * экране и старую квоту на приборе, без единого следа причины.
 */
export interface ContextSyncCount {
  updated: number;
  failed: number;
}

/** Предпросмотр понижения по узлу — follower `DowngradeNodePreview` оркестратора (#2587 b4b). */
export interface DowngradeNodePreview {
  nodeId: string;
  keepCount: number;
  keepBytes: number;
  freezeCount: number;
  freezeBytes: number;
  planDigest: string;
  /** Есть что морозить — узел требует подтверждения. */
  excess: boolean;
}

/** План понижения по узлам; срок — снимок сервера, кабинет его только читает. */
export interface DowngradePreviewPlan {
  ok: true;
  downgrade: true;
  fromTariffId: string;
  toTariffId: string;
  criterion: string;
  retentionDays: number;
  expiresAtEstimate: string;
  nodes: DowngradeNodePreview[];
  requiresConfirmation: boolean;
}

/** Исход предпросмотра: не понижение / план / доменный отказ. */
export type DowngradePreviewOutcome =
  | { ok: true; downgrade: false; fromTariffId: string; toTariffId: string }
  | DowngradePreviewPlan
  | { ok: false; reason: string; detail?: string };

/** Узел, чей избыток заморожен до commit тарифа; `expiresAt` поставил сервер записей. */
export interface FrozenNodeView {
  nodeId: string;
  batchId: string;
  frozenBytes: number;
  expiresAt: string;
}

/** Сбой заморозки узла: `reason` — словарь сервера записей (`plan_stale`, `media_unavailable`, …). */
export interface FreezeFailureView {
  nodeId: string;
  reason: string;
  detail: string;
}

export type SelectTariffOutcome =
  | { ok: true; fromTariffId: string; toTariffId: string; contextSync: ContextSyncCount; frozen?: FrozenNodeView[] }
  | { ok: false; reason: 'preview_required'; preview: DowngradePreviewPlan }
  | { ok: false; reason: 'freeze_failed'; failures: FreezeFailureView[]; frozen: FrozenNodeView[] }
  | { ok: false; reason: TariffDenyReason | (string & Record<never, never>); detail?: string };

/** Витрина: что можно выбрать. Транспортная ошибка (503 «сетка недоступна») — throw. */
export async function fetchTariffCatalog(): Promise<TariffCatalogView> {
  const res = await authFetch('/v1/tariffs');
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as TariffCatalogView;
}

/**
 * Смена тарифа собственным выбором. Доменный исход (ok|reason) — возврат, не исключение.
 * `previewDigests` (`nodeId → planDigest`) — ровно те хеши, что человек видел в предпросмотре.
 */
export async function selectTariff(
  toTariffId: string,
  previewDigests?: Record<string, string>,
): Promise<SelectTariffOutcome> {
  const res = await authFetch('/v1/membranes/me/tariff', {
    method: 'POST',
    body: JSON.stringify(previewDigests ? { toTariffId, previewDigests } : { toTariffId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SelectTariffOutcome;
}

/** Предпросмотр понижения (#2587 b4b): ничего не меняет ни в кабинете, ни на сервере записей. */
export async function previewTariffDowngrade(toTariffId: string): Promise<DowngradePreviewOutcome> {
  const res = await authFetch('/v1/membranes/me/tariff/preview', {
    method: 'POST',
    body: JSON.stringify({ toTariffId }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as DowngradePreviewOutcome;
}

/** Режим отбора при понижении — follower `DowngradePolicyView` (#2587 b4a). */
export interface DowngradePolicyView {
  criterion: string;
  /** Строки нет — действует умолчание сервера. */
  isDefault: boolean;
}

export type SetDowngradePolicyOutcome =
  | { ok: true; policy: DowngradePolicyView }
  | { ok: false; reason: string; detail?: string };

/** Текущий режим отбора мембраны сессии. */
export async function fetchDowngradePolicy(): Promise<DowngradePolicyView> {
  const res = await authFetch('/v1/membranes/me/downgrade-policy');
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as DowngradePolicyView;
}

/** Запись режима; вне закрытой тройки — доменный отказ `unknown_criterion`, не исключение. */
export async function setDowngradePolicy(criterion: string): Promise<SetDowngradePolicyOutcome> {
  const res = await authFetch('/v1/membranes/me/downgrade-policy', {
    method: 'PUT',
    body: JSON.stringify({ criterion }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as SetDowngradePolicyOutcome;
}
