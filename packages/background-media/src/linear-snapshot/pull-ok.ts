/**
 * Предикат `pullOk(S)` — чистая булева функция **только от файла** снимка
 * (вердикт M3 / К3 `linear-egress-gear-wiring`).
 *
 * `pullOk(S) := hasFullHeader ∧ producedBy='media-NL' ∧ egressRegion='NL'
 *   ∧ sourceRevision≠∅ ∧ mode='batch-full-pull' ∧ recordCount=|B|`
 *
 * Запрещено: сетевые вызовы, `Date.now()` / `now()` внутри тела.
 * Freshness (`age(capturedAt) ≤ τ`) — отдельная функция вне `pullOk`.
 */
import type { LinearSnapshot } from './linear-snapshot.types';
import {
  LINEAR_SNAPSHOT_EGRESS_REGION,
  LINEAR_SNAPSHOT_FORMAT,
  LINEAR_SNAPSHOT_MODE,
  LINEAR_SNAPSHOT_PRODUCED_BY,
} from './linear-snapshot.types';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Структурная проверка обязательных полей honest-шапки (без сверки с телом).
 */
export function hasFullHeader(snapshot: unknown): boolean {
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return false;
  }
  const header = (snapshot as { header?: unknown }).header;
  if (header === null || typeof header !== 'object' || Array.isArray(header)) {
    return false;
  }
  const h = header as Record<string, unknown>;
  if (h.format !== LINEAR_SNAPSHOT_FORMAT) return false;
  if (!isNonEmptyString(h.capturedAt) || Number.isNaN(Date.parse(h.capturedAt))) return false;
  if (!isNonEmptyString(h.sourceRevision)) return false;
  if (h.producedBy !== LINEAR_SNAPSHOT_PRODUCED_BY) return false;
  if (h.egressRegion !== LINEAR_SNAPSHOT_EGRESS_REGION) return false;
  if (h.mode !== LINEAR_SNAPSHOT_MODE) return false;
  if (!isNonEmptyString(h.trigger)) return false;
  if (!Number.isInteger(h.recordCount) || Number(h.recordCount) < 0) return false;
  return true;
}

/**
 * Боевой pull успешен ⇔ артефакт с полной honest-шапкой media-NL и согласованным телом.
 * Чистая функция: тот же вход → тот же выход. Сети нет по конструкции.
 */
export function pullOk(snapshot: unknown): boolean {
  if (!hasFullHeader(snapshot)) return false;
  const s = snapshot as LinearSnapshot;
  if (!Array.isArray(s.records)) return false;
  return s.header.recordCount === s.records.length;
}
