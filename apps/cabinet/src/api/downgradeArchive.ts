/**
 * Клиент дверей возврата из архива понижения (#2619): партии по узлам мембраны и возврат партии.
 *
 * Типы — FOLLOWER сервера кабинета (`tariff-archive.service.ts`). Доменный исход (`ok` / `reason`)
 * — значение; транспорт (401/5xx) — исключение, как у соседних клиентов (`tariff.ts`).
 */
import { getApiBase } from './auth';

/** Партия архива: `expiresAt` — день удаления, поставленный сервером записей при заморозке. */
export interface ArchiveBatchItem {
  batchId: string;
  /** `frozen` — в архиве, вернуть можно; `restored` / `deleted` / `failed` — только для сведения. */
  state: string;
  frozenAt: string;
  expiresAt: string;
  frozenBytes: number;
  sampleCount: number;
}

/** Узел с партиями; `unavailable` — сервер записей по этому узлу не ответил. */
export type ArchiveNodeView =
  | { nodeId: string; batches: ArchiveBatchItem[] }
  | { nodeId: string; unavailable: string };

export type ArchiveRestoreOutcome =
  | { ok: true; nodeId: string; batch: ArchiveBatchItem; restored: number }
  | { ok: false; reason: string; detail?: string };

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = sessionStorage.getItem('membrana.cabinet.sessionToken');
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
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

/** Партии архива понижения по всем узлам мембраны сессии. */
export async function fetchArchiveBatches(): Promise<ArchiveNodeView[]> {
  const res = await authFetch('/v1/membranes/me/archive/batches');
  if (!res.ok) throw new Error(await parseError(res));
  return ((await res.json()) as { nodes: ArchiveNodeView[] }).nodes;
}

/** Вернуть партию целиком в живой буфер. Отказ (`archive_expired`, `insufficient_quota`, …) — значение. */
export async function restoreArchiveBatch(batchId: string): Promise<ArchiveRestoreOutcome> {
  const res = await authFetch(`/v1/membranes/me/archive/batches/${encodeURIComponent(batchId)}/restore`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ArchiveRestoreOutcome;
}
