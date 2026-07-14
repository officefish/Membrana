import { apiPath } from './appMeta';
import type { BenchmarkSummary, DriftAnchorRecord } from './quality';

/**
 * HTTP-клиент бордов качества (#454). Относительные /v1-пути + credentials:
 * 'include' (сессия в httpOnly cookie) — конвенция authApi (OP2).
 * Ошибки различаем по типу — борды показывают честные состояния.
 */

export type QualityFetch<T> =
  | { state: 'ok'; data: T }
  | { state: 'forbidden' }
  | { state: 'empty' }
  | { state: 'error' };

export async function fetchDriftDigest(): Promise<QualityFetch<DriftAnchorRecord[]>> {
  try {
    const res = await fetch(apiPath('drift-anchor/digest'), { credentials: 'include' });
    if (!res.ok) return { state: 'error' };
    const body = (await res.json()) as { records?: DriftAnchorRecord[] };
    const records = Array.isArray(body.records) ? body.records : [];
    return records.length === 0 ? { state: 'empty' } : { state: 'ok', data: records };
  } catch {
    return { state: 'error' };
  }
}

export async function fetchBenchmarkSummary(): Promise<QualityFetch<BenchmarkSummary>> {
  try {
    const res = await fetch(apiPath('benchmark/summary'), { credentials: 'include' });
    if (res.status === 401 || res.status === 403) return { state: 'forbidden' };
    if (res.status === 404) return { state: 'empty' };
    if (!res.ok) return { state: 'error' };
    return { state: 'ok', data: (await res.json()) as BenchmarkSummary };
  } catch {
    return { state: 'error' };
  }
}
