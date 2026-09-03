import { getApiBase } from './auth';

export interface NodeQuotaSummary {
  userStorage: { usedBytes: number; limitBytes: number };
  buffer: { usedBytes: number; limitBytes: number };
  dataset: { catalogId: string; sampleCount: number };
}

export interface MembraneNodeLibrary {
  id: string;
  label: string;
  deviceId: string | null;
  paired: boolean;
  lastPairedAt: string | null;
  lastSeenAt: string | null;
  quota: NodeQuotaSummary | null;
}

export interface MembraneCatalogSample {
  id: string;
  title: string;
  class: string;
  label: string;
  durationSec: number;
  sampleRate: number;
  sizeBytes: number;
  createdAt: string;
  notes?: string;
}

export interface MembraneCatalog {
  catalogId: string;
  sampleCount: number;
  samples: MembraneCatalogSample[];
  sourceDeviceId: string | null;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MediaSessionDevice {
  nodeId: string;
  nodeLabel: string;
  deviceId: string;
}

export interface MediaSession {
  mediaApiUrl: string;
  mediaToken: string;
  membraneId: string;
  catalogId: string;
  devices: MediaSessionDevice[];
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

export async function fetchMembraneNodes(
  membraneId: string,
): Promise<{ nodes: MembraneNodeLibrary[] }> {
  const res = await authFetch(`/v1/membranes/${membraneId}/nodes`);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { nodes: MembraneNodeLibrary[] };
}

export async function fetchMembraneCatalog(
  membraneId: string,
  page = 1,
  limit = 40,
): Promise<MembraneCatalog> {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await authFetch(`/v1/membranes/${membraneId}/catalog?${query}`);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MembraneCatalog;
}

export async function fetchMediaSession(): Promise<MediaSession> {
  const res = await authFetch('/v1/media/session');
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MediaSession;
}

export async function patchCatalogSample(
  membraneId: string,
  sampleId: string,
  patch: { label?: string; notes?: string | null },
): Promise<MembraneCatalogSample> {
  const res = await authFetch(
    `/v1/membranes/${encodeURIComponent(membraneId)}/catalog/samples/${encodeURIComponent(sampleId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MembraneCatalogSample;
}

/**
 * Срок ключей треков мембраны (#2271, вердикт M3).
 *
 * Ходим НАПРЯМУЮ в media, а не через кабинетный backend: настройка живёт в его базе, и
 * посредник добавил бы третью копию правды о сроке. Адрес и токен берутся из той же сессии,
 * что и остальная работа с библиотекой.
 *
 * ПРИБОР, А НЕ МЕМБРАНА В АДРЕСЕ. Кабинет знает прибор; мембрану media ВЫВОДИТ из него сам —
 * принять её из запроса значило бы поверить обратившемуся на слово, а это частный случай
 * угадывания владельца, запрещённого M1.
 */
export type TrackKeyTtlMode = 'default' | 'seconds' | 'lifted';

export interface TrackKeyTtlView {
  readonly stored: unknown;
  readonly effective: { readonly seconds: number | null; readonly source: string; readonly reason?: string };
  readonly defaultSeconds: number;
  readonly maxSeconds: number;
  /** Названная граница: настройка узловая, мембранный масштаб вердикта M3 ещё не исполнен. */
  readonly scopeCaveat: string;
}

async function mediaFetch(deviceId: string, init: RequestInit = {}): Promise<Response> {
  const session = await fetchMediaSession();
  const headers = new Headers(init.headers);
  headers.set('X-Membrana-Token', session.mediaToken);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const base = session.mediaApiUrl.replace(/\/+$/u, '');
  return fetch(`${base}/v1/devices/${encodeURIComponent(deviceId)}/track-key-ttl`, {
    ...init,
    headers,
  });
}

export async function fetchTrackKeyTtl(deviceId: string): Promise<TrackKeyTtlView> {
  const res = await mediaFetch(deviceId);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as TrackKeyTtlView;
}

/**
 * Записать волю человека.
 *
 * `liftedBy` обязателен при снятии срока: неподписанное снятие неотличимо от повреждённой
 * записи, и media его отвергнет. Кабинет не обходит этот отказ, а показывает его.
 */
export async function writeTrackKeyTtl(
  deviceId: string,
  body: { mode: TrackKeyTtlMode; seconds?: number | null; liftedBy?: string | null },
): Promise<TrackKeyTtlView> {
  const res = await mediaFetch(deviceId, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as TrackKeyTtlView;
}
