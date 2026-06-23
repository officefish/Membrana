const DEFAULT_CABINET_API_URL = 'https://cabinet.membrana.space';
const DEFAULT_MEDIA_API_URL = 'https://media.membrana.space';

/** API base: env override or prod cabinet (dev and prod hit membrana.space directly). */
export function getCabinetApiBase(): string {
  const fromEnv = import.meta.env.VITE_CABINET_API_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  return DEFAULT_CABINET_API_URL;
}

/** Media API: env override, pairing response, or prod default. */
export function resolveMediaApiBase(urlFromPairing: string): string {
  const fromEnv = import.meta.env.VITE_MEDIA_API_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  const trimmed = urlFromPairing.replace(/\/$/, '');
  if (trimmed.length > 0) {
    return trimmed;
  }
  return DEFAULT_MEDIA_API_URL;
}

export interface PairResponse {
  token: string;
  expiresAt: string;
  deviceId: string;
  mediaToken: string;
  mediaApiUrl: string;
  membrane: { id: string };
  node: { id: string; label: string };
  pairedKeyId?: string;
  tariff?: {
    id: string;
    maxUserWorkspaces?: number;
  };
}

export interface PairStatusLinked {
  linked: true;
  keyActive: boolean;
  inactiveReason: 'revoked' | 'expired' | null;
  membrane: { id: string };
  node: { id: string; label: string };
  deviceId: string;
  pairedKeyId: string | null;
  sessionExpiresAt: string | null;
  tariff?: {
    id: string;
    maxUserWorkspaces?: number;
  };
}

export interface PairStatusUnlinked {
  linked: false;
}

export type PairStatusResponse = PairStatusLinked | PairStatusUnlinked;

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

export async function pairWithAccessKey(
  accessKey: string,
  clientLabel?: string,
): Promise<PairResponse> {
  const res = await fetch(`${getCabinetApiBase()}/v1/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessKey, clientLabel }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as PairResponse;
}

export async function fetchPairStatus(
  token: string,
): Promise<PairStatusResponse | 'session_expired' | 'endpoint_unavailable'> {
  const res = await fetch(`${getCabinetApiBase()}/v1/pair/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) return 'session_expired';
  if (res.status === 404) return 'endpoint_unavailable';
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as PairStatusResponse;
}

/** Lightweight reachability check for paired mode (cabinet health). */
export async function pingCabinetApi(): Promise<boolean> {
  try {
    const res = await fetch(`${getCabinetApiBase()}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pingMediaApi(mediaApiUrl: string, mediaToken: string, deviceId: string): Promise<boolean> {
  const base = resolveMediaApiBase(mediaApiUrl);
  try {
    const res = await fetch(`${base}/v1/devices/${encodeURIComponent(deviceId)}/quota`, {
      headers: {
        'X-Membrana-Token': mediaToken,
        'X-Membrana-Device-Id': deviceId,
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}
