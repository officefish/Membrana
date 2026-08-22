import type { LiveJournalFilter, LiveJournalItem } from '@membrana/telemetry-journal-service';
import { LIVE_JOURNAL_PAGE_SIZE } from '@membrana/telemetry-journal-service';
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
  readonly counts: Record<LiveJournalFilter, number>;
}

export async function fetchTelemetryJournalItems(
  query: FetchTelemetryJournalItemsQuery = {},
): Promise<PaginatedTelemetryJournalItemsResponse> {
  const params = new URLSearchParams();
  params.set('limit', String(query.limit ?? LIVE_JOURNAL_PAGE_SIZE));
  if (query.mediaDeviceId) params.set('mediaDeviceId', query.mediaDeviceId);
  if (query.cursor) params.set('cursor', query.cursor);
  if (query.filter && query.filter !== 'all') params.set('filter', query.filter);

  const res = await authFetch(`/v1/telemetry/journal-items?${params.toString()}`);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as PaginatedTelemetryJournalItemsResponse;
}

export interface DeleteTelemetryJournalItemsQuery {
  readonly filter: LiveJournalFilter;
  readonly mediaDeviceId?: string;
}

export async function deleteTelemetryJournalItems(
  query: DeleteTelemetryJournalItemsQuery,
): Promise<{ deleted: number }> {
  const params = new URLSearchParams();
  params.set('filter', query.filter);
  if (query.mediaDeviceId) params.set('mediaDeviceId', query.mediaDeviceId);

  const res = await authFetch(`/v1/telemetry/journal-items?${params.toString()}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { deleted: number };
}

/**
 * Жильцы дома журнала. Адаптер И-6 интеграции коворка `cowork-server-plugin-pages`.
 *
 * Дом отдаёт манифест и включённость РЯДОМ, а не включённость внутри манифеста: манифест — ровно
 * пять полей плюс форма показа, включённость же есть операция реестра (M5′).
 */
export interface JournalPluginStateView {
  readonly manifest: {
    readonly id: string;
    readonly version: string;
    readonly kind: 'handler' | 'report' | 'showcase';
    readonly mountTarget: string;
    readonly triggers: readonly string[];
    readonly displayForm?: string;
    readonly description?: string;
  };
  readonly enabled: boolean;
}

export async function fetchJournalPlugins(): Promise<readonly JournalPluginStateView[]> {
  const res = await authFetch('/v1/telemetry/plugins');
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { plugins: readonly JournalPluginStateView[] };
  return body.plugins;
}

/** Переключить включённость. Владелец состояния — дом; страница просит, а не решает. */
export async function setJournalPluginEnabled(pluginId: string, enabled: boolean): Promise<void> {
  const res = await authFetch(`/v1/telemetry/plugins/${encodeURIComponent(pluginId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

/**
 * Выборка чарт-листа. Блоки c6a/c6b спринта `chart-list-plugin`.
 *
 * Отказ отбора приходит ПОЛЕМ `refusal`, а не кодом: «фон не измерен» — исход работы, о котором
 * человек должен прочесть словами. Ошибкой остаётся только негодная форма запроса.
 */
export interface ChartListPickDto {
  readonly rank: number;
  readonly entryId: string;
  readonly sampleId: string;
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly structure: string;
  readonly flatness: number;
  readonly displaced: number;
}

export interface ChartListSelectionDto {
  readonly id: string;
  readonly criterion: string;
  readonly volume: number;
  readonly asked: number;
  readonly measured: number;
  readonly shortfall: number;
  readonly createdAt: string;
  readonly picks: readonly ChartListPickDto[];
}

export interface ChartListGenerateResponse {
  readonly selection: ChartListSelectionDto | null;
  readonly refusal: { readonly reason: string; readonly detail: string } | null;
}

export async function generateChartList(input: {
  entryIds: readonly string[];
  volume: number;
  criterion: string;
}): Promise<ChartListGenerateResponse> {
  const res = await authFetch('/v1/telemetry/chart-list', {
    method: 'POST',
    body: JSON.stringify({ entryIds: [...input.entryIds], volume: input.volume, criterion: input.criterion }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ChartListGenerateResponse;
}

/** Перечень собранного, свежие первыми. Нужен, чтобы страница открылась с последней выборкой. */
export async function listChartLists(limit = 20): Promise<readonly ChartListSelectionDto[]> {
  const res = await authFetch(`/v1/telemetry/chart-list?limit=${limit}`);
  if (!res.ok) throw new Error(await parseError(res));
  const body = (await res.json()) as { selections: readonly ChartListSelectionDto[] };
  return body.selections;
}

/** Открыть собранную выборку по адресу — то, ради чего она хранится (Т3). */
export async function openChartList(selectionId: string): Promise<ChartListSelectionDto> {
  const res = await authFetch(`/v1/telemetry/chart-list/${encodeURIComponent(selectionId)}`);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ChartListSelectionDto;
}
