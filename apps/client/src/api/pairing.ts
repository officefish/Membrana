/** API base: dev proxy `/api-cabinet` or explicit env. */
export function getCabinetApiBase(): string {
  const fromEnv = import.meta.env.VITE_CABINET_API_URL as string | undefined;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, '');
  }
  return '/api-cabinet';
}

export interface PairResponse {
  token: string;
  expiresAt: string;
  deviceId: string;
  mediaToken: string;
  mediaApiUrl: string;
  membrane: { id: string };
  node: { id: string; label: string };
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
  const base = mediaApiUrl.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/v1/devices/${deviceId}`, {
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
