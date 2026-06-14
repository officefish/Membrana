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
}

export interface MembraneCatalog {
  catalogId: string;
  sampleCount: number;
  samples: MembraneCatalogSample[];
  sourceDeviceId: string | null;
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

export async function fetchMembraneCatalog(membraneId: string): Promise<MembraneCatalog> {
  const res = await authFetch(`/v1/membranes/${membraneId}/catalog`);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MembraneCatalog;
}

export async function fetchMediaSession(): Promise<MediaSession> {
  const res = await authFetch('/v1/media/session');
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MediaSession;
}
