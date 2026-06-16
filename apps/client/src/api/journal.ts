import type { LiveJournalFilter, LiveJournalItem } from '@membrana/telemetry-journal-service';
import { getCabinetApiBase } from './pairing';

export interface UploadTelemetryReportBody {
  reportKind: string;
  clientEntryId?: string;
  moduleId?: string;
  moduleName?: string;
  finishedAt: string;
  payload: Record<string, unknown>;
  tags?: string[];
}

export interface UploadTelemetryLiveRecordBody {
  recordKind: string;
  clientRecordId?: string;
  moduleId?: string;
  startedAt: string;
  payload: Record<string, unknown>;
}

export interface TelemetryReportRow {
  id: string;
  reportKind: string;
  clientEntryId: string | null;
  moduleId: string | null;
  moduleName: string | null;
  finishedAt: string;
  payload: Record<string, unknown>;
  tags: string[];
}

export interface TelemetryLiveRecordRow {
  id: string;
  recordKind: string;
  clientRecordId: string | null;
  moduleId: string | null;
  status: 'active' | 'ended';
  startedAt: string;
  payload: Record<string, unknown>;
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

export async function uploadTelemetryReport(
  token: string,
  body: UploadTelemetryReportBody,
): Promise<{ report: { id: string }; deduplicated: boolean }> {
  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { report: { id: string }; deduplicated: boolean };
}

export async function createTelemetryLiveRecord(
  token: string,
  body: UploadTelemetryLiveRecordBody,
): Promise<{ liveRecord: { id: string }; deduplicated: boolean }> {
  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/live-records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { liveRecord: { id: string }; deduplicated: boolean };
}

export async function endTelemetryLiveRecord(
  token: string,
  recordId: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/live-records/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'ended',
      ...(payload ? { payload } : {}),
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function listTelemetryReports(
  token: string,
  limit = 200,
): Promise<{ reports: TelemetryReportRow[] }> {
  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/reports?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { reports: TelemetryReportRow[] };
}

export async function listTelemetryLiveRecords(
  token: string,
  limit = 200,
): Promise<{ liveRecords: TelemetryLiveRecordRow[] }> {
  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/live-records?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { liveRecords: TelemetryLiveRecordRow[] };
}

/** Unified live journal list (TJ6, TJ9). Returns null when cabinet-api has no route yet (404). */
export interface ListTelemetryJournalItemsQuery {
  readonly limit?: number;
  readonly mediaDeviceId?: string;
  readonly cursor?: string | null;
  readonly filter?: 'all' | 'tracks' | 'reports' | 'detections';
}

export interface PaginatedTelemetryJournalItems {
  readonly items: LiveJournalItem[];
  readonly nextCursor: string | null;
  readonly counts: Record<LiveJournalFilter, number>;
}

export async function listTelemetryJournalItems(
  token: string,
  query: ListTelemetryJournalItemsQuery = {},
): Promise<PaginatedTelemetryJournalItems | null> {
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? 50));
  if (query.mediaDeviceId) params.set('mediaDeviceId', query.mediaDeviceId);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.filter && query.filter !== 'all') params.set('filter', query.filter);

  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/journal-items?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as PaginatedTelemetryJournalItems;
}

export interface DeleteTelemetryJournalItemsQuery {
  readonly filter: LiveJournalFilter;
  readonly mediaDeviceId?: string;
}

export async function deleteTelemetryJournalItems(
  token: string,
  query: DeleteTelemetryJournalItemsQuery,
): Promise<{ deleted: number }> {
  const params = new URLSearchParams();
  params.set('filter', query.filter);
  if (query.mediaDeviceId) params.set('mediaDeviceId', query.mediaDeviceId);

  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/journal-items?${params.toString()}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { deleted: number };
}
