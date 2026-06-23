import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';
import type { DeviceBoardPersistAdapter, DeviceScenarioRemoteRecord } from '@membrana/device-board';

import { resolveMediaApiBase } from '@/api/pairing';
import { readPersistedPairedCredentials } from '@/lib/resolveMediaLibraryBackend';
import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { createDeviceBoardWorkspacePersistApi } from './device-board-workspace-persist.js';
import {
  clearLegacyDeviceScenarioLocalRecord,
  LEGACY_DEVICE_SCENARIO_STORAGE_KEY,
  LEGACY_DEVICE_SCENARIO_UPDATED_AT_KEY,
  readLegacyDeviceScenarioLocalRecord,
} from './device-board-workspace-persist.js';
import {
  fetchRemoteActiveWorkspaceRecord,
  isDeviceWorkspacesApiAvailable,
  putRemoteActiveWorkspaceRecord,
} from './device-workspaces-api.js';
import { resolveDeviceBoardPersistDeviceId } from './resolveDeviceBoardPersistDeviceId.js';

function scenarioUrl(creds: PairedNodeCredentials): string {
  const base = resolveMediaApiBase(creds.mediaApiUrl);
  return `${base}/v1/devices/${encodeURIComponent(creds.deviceId)}/device-scenario`;
}

function mediaHeaders(creds: PairedNodeCredentials): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Membrana-Token': creds.mediaToken,
    'X-Membrana-Device-Id': creds.deviceId,
  };
}

async function fetchRemoteRecord(creds: PairedNodeCredentials): Promise<DeviceScenarioRemoteRecord | null> {
  try {
    const res = await fetch(scenarioUrl(creds), { method: 'GET', headers: mediaHeaders(creds) });
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

async function putRemoteRecord(
  creds: PairedNodeCredentials,
  document: DeviceScenarioDocument,
): Promise<DeviceScenarioRemoteRecord | null> {
  try {
    const res = await fetch(scenarioUrl(creds), {
      method: 'PUT',
      headers: mediaHeaders(creds),
      body: JSON.stringify(document),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as DeviceScenarioRemoteRecord;
    const parsed = parseDeviceScenarioDocument(body.document);
    if (!parsed.ok) return null;
    return { document: parsed.value, updatedAt: body.updatedAt };
  } catch {
    return null;
  }
}

function pickNewer(
  local: DeviceScenarioRemoteRecord | null,
  remote: DeviceScenarioRemoteRecord | null,
): DeviceScenarioRemoteRecord | null {
  if (local === null) return remote;
  if (remote === null) return local;
  return remote.updatedAt >= local.updatedAt ? remote : local;
}

/**
 * Persist adapter: active user workspace в IndexedDB (U10 W3).
 * Paired: LWW с media — multi-workspace API (W5) или legacy single-scenario.
 */
export function createClientDeviceBoardPersistAdapter(
  deviceId: string,
  maxUserWorkspaces = 3,
): DeviceBoardPersistAdapter {
  const workspacePersist = createDeviceBoardWorkspacePersistApi(deviceId, maxUserWorkspaces);

  const creds = readPersistedPairedCredentials();
  if (creds === null || creds.deviceId !== deviceId) {
    return {
      async load() {
        return workspacePersist.loadActive();
      },
      async save(document) {
        return workspacePersist.saveActive(document);
      },
    };
  }

  return {
    async load() {
      const local = await workspacePersist.loadActive();
      const workspacesApi = await isDeviceWorkspacesApiAvailable(creds);
      const remote = workspacesApi
        ? await fetchRemoteActiveWorkspaceRecord(creds)
        : await fetchRemoteRecord(creds);
      const winner = pickNewer(local, remote);
      if (winner !== null && winner !== local) {
        await workspacePersist.saveActive(winner.document);
      }
      return winner ?? local;
    },
    async save(document) {
      const local = await workspacePersist.saveActive(document);
      const workspacesApi = await isDeviceWorkspacesApiAvailable(creds);
      const remote = workspacesApi
        ? await putRemoteActiveWorkspaceRecord(creds, local.document)
        : await putRemoteRecord(creds, local.document);
      return remote ?? local;
    },
  };
}

/** Адаптер с deviceId из persisted connection (runtime controller, тесты). */
export function createClientDeviceBoardPersistAdapterFromSession(): DeviceBoardPersistAdapter {
  const creds = readPersistedPairedCredentials();
  const deviceId = resolveDeviceBoardPersistDeviceId(creds);
  return createClientDeviceBoardPersistAdapter(deviceId);
}

export {
  clearLegacyDeviceScenarioLocalRecord,
  LEGACY_DEVICE_SCENARIO_STORAGE_KEY,
  LEGACY_DEVICE_SCENARIO_UPDATED_AT_KEY,
  readLegacyDeviceScenarioLocalRecord,
};

/** Сброс legacy local cache (тесты). */
export function resetDeviceScenarioPersistenceForTests(): void {
  clearLegacyDeviceScenarioLocalRecord();
}
