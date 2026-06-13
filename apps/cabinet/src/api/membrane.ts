import { getApiBase } from './auth';

export type NodeAccessKeyDuration =
  | 'hours_4'
  | 'days_3'
  | 'weeks_2'
  | 'month_1'
  | 'months_3';

export const DURATION_OPTIONS: { value: NodeAccessKeyDuration; label: string }[] = [
  { value: 'hours_4', label: '4 часа' },
  { value: 'days_3', label: '3 дня' },
  { value: 'weeks_2', label: '2 недели' },
  { value: 'month_1', label: '1 месяц' },
  { value: 'months_3', label: '3 месяца' },
];

export interface TariffView {
  id: string;
  name: string;
  datasetQuotaBytes: string;
  bufferQuotaBytes: string;
  maxActiveKeysPerNode: number;
}

export interface AccessKeyView {
  id: string;
  duration: NodeAccessKeyDuration;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  active: boolean;
}

export interface NodeView {
  id: string;
  label: string;
  createdAt: string;
  accessKeys: AccessKeyView[];
}

export interface MembraneView {
  membrane: {
    id: string;
    tariff: TariffView;
    createdAt: string;
  };
  node: NodeView | null;
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

export async function fetchMembraneMe(): Promise<MembraneView> {
  const res = await authFetch('/v1/membranes/me');
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MembraneView;
}

export async function createNode(label?: string): Promise<{ node: NodeView }> {
  const res = await authFetch('/v1/membranes/me/nodes', {
    method: 'POST',
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { node: NodeView };
}

export async function createAccessKey(
  nodeId: string,
  duration: NodeAccessKeyDuration,
): Promise<{ key: string; accessKey: AccessKeyView }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/access-keys`, {
    method: 'POST',
    body: JSON.stringify({ duration }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { key: string; accessKey: AccessKeyView };
}

export async function revokeAccessKey(keyId: string): Promise<{ accessKey: AccessKeyView }> {
  const res = await authFetch(`/v1/access-keys/${keyId}/revoke`, { method: 'POST' });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { accessKey: AccessKeyView };
}

export async function purgeRevokedAccessKeys(
  nodeId: string,
): Promise<{ deletedCount: number }> {
  const res = await authFetch(`/v1/nodes/${nodeId}/access-keys/purge-revoked`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { deletedCount: number };
}
