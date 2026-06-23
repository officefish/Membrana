import { parseDeviceScenarioDocument, type DeviceScenarioDocument } from '@membrana/core';
import type { DeviceBoardWorkspaceListItem, DeviceScenarioRemoteRecord } from '@membrana/device-board';

import { resolveMediaApiBase } from '@/api/pairing';
import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { WorkspacePersistConflictError } from './workspace-persist-conflict.js';
import { WorkspacePersistError } from './workspace-persist-error.js';

export interface PutRemoteWorkspaceOptions {
  readonly expectedUpdatedAt?: string;
}

export interface DeviceWorkspaceListResponse {
  activeWorkspaceId: string | null;
  workspaces: DeviceBoardWorkspaceListItem[];
}

const availabilityCache = new Map<string, boolean>();

function workspacesBase(creds: PairedNodeCredentials): string {
  const base = resolveMediaApiBase(creds.mediaApiUrl);
  return `${base}/v1/devices/${encodeURIComponent(creds.deviceId)}/device-workspaces`;
}

function mediaHeaders(creds: PairedNodeCredentials): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Membrana-Token': creds.mediaToken,
    'X-Membrana-Device-Id': creds.deviceId,
  };
}

/** Clears feature-detect cache (tests + pair reconnect, U11 S2-W1). */
export function resetDeviceWorkspacesApiCacheForTests(): void {
  availabilityCache.clear();
}

/** Drop cached availability for one device (pair reconnect). */
export function invalidateDeviceWorkspacesApiCache(deviceId?: string): void {
  if (deviceId === undefined) {
    availabilityCache.clear();
    return;
  }
  availabilityCache.delete(deviceId);
}

/** True when media exposes multi-workspace REST (U10 W5). */
export async function isDeviceWorkspacesApiAvailable(creds: PairedNodeCredentials): Promise<boolean> {
  const cached = availabilityCache.get(creds.deviceId);
  if (cached === true) {
    return true;
  }
  try {
    const res = await fetch(workspacesBase(creds), { method: 'GET', headers: mediaHeaders(creds) });
    const available = res.status !== 404 && res.ok;
    if (available) {
      availabilityCache.set(creds.deviceId, true);
    } else {
      availabilityCache.delete(creds.deviceId);
    }
    return available;
  } catch {
    availabilityCache.delete(creds.deviceId);
    return false;
  }
}

export async function fetchRemoteWorkspaceList(
  creds: PairedNodeCredentials,
): Promise<DeviceWorkspaceListResponse | null> {
  try {
    const res = await fetch(workspacesBase(creds), { method: 'GET', headers: mediaHeaders(creds) });
    if (!res.ok) return null;
    return (await res.json()) as DeviceWorkspaceListResponse;
  } catch {
    return null;
  }
}

export async function fetchRemoteWorkspaceRecord(
  creds: PairedNodeCredentials,
  workspaceId: string,
): Promise<DeviceScenarioRemoteRecord | null> {
  try {
    const res = await fetch(`${workspacesBase(creds)}/${encodeURIComponent(workspaceId)}`, {
      method: 'GET',
      headers: mediaHeaders(creds),
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as DeviceScenarioRemoteRecord;
    const parsed = parseDeviceScenarioDocument(body.document);
    if (!parsed.ok) return null;
    return { document: parsed.value, updatedAt: body.updatedAt };
  } catch {
    return null;
  }
}

export async function putRemoteWorkspaceRecord(
  creds: PairedNodeCredentials,
  workspaceId: string,
  document: DeviceScenarioDocument,
  options?: PutRemoteWorkspaceOptions,
): Promise<DeviceScenarioRemoteRecord> {
  const url = new URL(`${workspacesBase(creds)}/${encodeURIComponent(workspaceId)}`);
  if (options?.expectedUpdatedAt !== undefined && options.expectedUpdatedAt.length > 0) {
    url.searchParams.set('expectedUpdatedAt', options.expectedUpdatedAt);
  }
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: 'PUT',
      headers: mediaHeaders(creds),
      body: JSON.stringify(document),
    });
  } catch (error) {
    throw new WorkspacePersistError(
      'Не удалось связаться с media-сервером при сохранении workspace',
    );
  }
  if (res.status === 409) {
    const body = (await res.json()) as {
      code?: string;
      currentUpdatedAt?: string;
      expectedUpdatedAt?: string;
    };
    throw new WorkspacePersistConflictError(
      'Сценарий на сервере новее — перезагрузите workspace',
      body.currentUpdatedAt ?? new Date().toISOString(),
      body.expectedUpdatedAt ?? options?.expectedUpdatedAt,
    );
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { message?: string | string[] };
      if (typeof body.message === 'string') {
        detail = body.message;
      } else if (Array.isArray(body.message)) {
        detail = body.message.join('; ');
      }
    } catch {
      /* ignore parse */
    }
    throw new WorkspacePersistError(
      `Сервер отклонил сохранение workspace (${res.status}): ${detail}`,
      res.status,
    );
  }
  const body = (await res.json()) as DeviceScenarioRemoteRecord;
  const parsed = parseDeviceScenarioDocument(body.document);
  if (!parsed.ok) {
    throw new WorkspacePersistError('Сервер вернул невалидный документ сценария');
  }
  return { document: parsed.value, updatedAt: body.updatedAt };
}

export async function deleteRemoteWorkspace(
  creds: PairedNodeCredentials,
  workspaceId: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${workspacesBase(creds)}/${encodeURIComponent(workspaceId)}`, {
      method: 'DELETE',
      headers: mediaHeaders(creds),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function setRemoteActiveWorkspaceId(
  creds: PairedNodeCredentials,
  activeWorkspaceId: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${workspacesBase(creds)}/active`, {
      method: 'PATCH',
      headers: mediaHeaders(creds),
      body: JSON.stringify({ activeWorkspaceId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchRemoteActiveWorkspaceRecord(
  creds: PairedNodeCredentials,
): Promise<DeviceScenarioRemoteRecord | null> {
  const list = await fetchRemoteWorkspaceList(creds);
  if (list === null || list.activeWorkspaceId === null) {
    return null;
  }
  return fetchRemoteWorkspaceRecord(creds, list.activeWorkspaceId);
}

export async function putRemoteActiveWorkspaceRecord(
  creds: PairedNodeCredentials,
  document: DeviceScenarioDocument,
  options?: PutRemoteWorkspaceOptions,
): Promise<DeviceScenarioRemoteRecord | null> {
  const list = await fetchRemoteWorkspaceList(creds);
  if (list === null) {
    return null;
  }
  const workspaceId = list.activeWorkspaceId ?? document.meta?.workspaceId ?? null;
  if (workspaceId === null || workspaceId.length === 0) {
    return null;
  }
  const saved = await putRemoteWorkspaceRecord(creds, workspaceId, document, options);
  if (saved !== null && list.activeWorkspaceId === null) {
    await setRemoteActiveWorkspaceId(creds, workspaceId);
  }
  return saved;
}
