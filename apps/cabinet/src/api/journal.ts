import type { LiveJournalFilter, LiveJournalItem } from '@membrana/telemetry-journal-service';
import { getApiBase } from './auth';

export interface TelemetryReportView {
  id: string;
  reportKind: string;
  moduleId: string | null;
  moduleName: string | null;
  clientEntryId: string | null;
  finishedAt: string;
  payload: Record<string, unknown>;
  tags: string[];
  nodeId: string | null;
  mediaDeviceId: string | null;
  createdAt: string;
}

export interface TelemetryLiveRecordView {
  id: string;
  recordKind: string;
  moduleId: string | null;
  clientRecordId: string | null;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt: string | null;
  payload: Record<string, unknown>;
  nodeId: string | null;
  mediaDeviceId: string | null;
  createdAt: string;
  updatedAt: string;
}

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
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

export async function fetchTelemetryReports(limit = 50): Promise<TelemetryReportView[]> {
  const res = await authFetch(`/v1/telemetry/reports?limit=${limit}`);
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { reports: TelemetryReportView[] };
  return body.reports;
}

export async function fetchTelemetryLiveRecords(
  limit = 50,
  mediaDeviceId?: string,
): Promise<TelemetryLiveRecordView[]> {
  const query = new URLSearchParams({ limit: String(limit) });
  if (mediaDeviceId) query.set('mediaDeviceId', mediaDeviceId);
  const res = await authFetch(`/v1/telemetry/live-records?${query.toString()}`);
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { liveRecords: TelemetryLiveRecordView[] };
  return body.liveRecords;
}

export interface FetchTelemetryJournalItemsQuery {
  readonly limit?: number;
  readonly mediaDeviceId?: string;
  readonly cursor?: string | null;
  readonly filter?: LiveJournalFilter;
}

export interface PaginatedTelemetryJournalItemsResponse {
  readonly items: LiveJournalItem[];
  readonly nextCursor: string | null;
}

export async function fetchTelemetryJournalItems(
  query: FetchTelemetryJournalItemsQuery = {},
): Promise<PaginatedTelemetryJournalItemsResponse> {
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? 50));
  if (query.mediaDeviceId) params.set('mediaDeviceId', query.mediaDeviceId);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.filter && query.filter !== 'all') params.set('filter', query.filter);

  const res = await authFetch(`/v1/telemetry/journal-items?${params.toString()}`);
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as PaginatedTelemetryJournalItemsResponse;
  return body;
}
