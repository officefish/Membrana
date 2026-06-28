import { getApiBase } from './auth';

export type BoardEditLeaseHolder = 'cabinet' | 'field' | 'none';

export interface ScenarioEditLeaseView {
  deviceId: string;
  holder: BoardEditLeaseHolder;
  sessionId: string | null;
  revision: number;
  expiresAt: string | null;
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

export async function acquireScenarioEditLease(
  nodeId: string,
  revision = 0,
): Promise<{ lease: ScenarioEditLeaseView }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/scenario/edit-lease`, {
    method: 'POST',
    body: JSON.stringify({ revision }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { lease: ScenarioEditLeaseView };
}

export async function renewScenarioEditLease(
  nodeId: string,
  revision?: number,
): Promise<{ lease: ScenarioEditLeaseView }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/scenario/edit-lease/renew`, {
    method: 'POST',
    body: JSON.stringify(revision !== undefined ? { revision } : {}),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { lease: ScenarioEditLeaseView };
}

export async function releaseScenarioEditLease(
  nodeId: string,
): Promise<{ lease: ScenarioEditLeaseView }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/scenario/edit-lease`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { lease: ScenarioEditLeaseView };
}

/** Heartbeat interval for edit lease renew (server-first v1). */
export const SCENARIO_EDIT_LEASE_RENEW_MS = 5 * 60 * 1000;
