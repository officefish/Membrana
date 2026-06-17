import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';
import type { DeviceBoardPersistAdapter, DeviceScenarioRemoteRecord } from '@membrana/device-board';

import { resolveMediaApiBase } from '@/api/pairing';
import { readPersistedPairedCredentials } from '@/lib/resolveMediaLibraryBackend';
import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

const LOCAL_STORAGE_KEY = 'membrana.device-scenario.v1';
const LOCAL_UPDATED_AT_KEY = 'membrana.device-scenario.updatedAt';

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

function readLocalRecord(): DeviceScenarioRemoteRecord | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const updatedAt = localStorage.getItem(LOCAL_UPDATED_AT_KEY);
    if (!raw || !updatedAt) return null;
    const parsed = parseDeviceScenarioDocument(JSON.parse(raw) as unknown);
    if (!parsed.ok) return null;
    return { document: parsed.value, updatedAt };
  } catch {
    return null;
  }
}

function writeLocalRecord(record: DeviceScenarioRemoteRecord): void {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(record.document));
  localStorage.setItem(LOCAL_UPDATED_AT_KEY, record.updatedAt);
}

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

/** Persist adapter: localStorage + media-server when paired (last-write-wins по updatedAt). */
export function createClientDeviceBoardPersistAdapter(): DeviceBoardPersistAdapter | undefined {
  const creds = readPersistedPairedCredentials();
  if (creds === null) {
    return {
      async load() {
        return readLocalRecord();
      },
      async save(document) {
        const record: DeviceScenarioRemoteRecord = {
          document,
          updatedAt: new Date().toISOString(),
        };
        writeLocalRecord(record);
        return record;
      },
    };
  }

  return {
    async load() {
      const [local, remote] = await Promise.all([Promise.resolve(readLocalRecord()), fetchRemoteRecord(creds)]);
      const winner = pickNewer(local, remote);
      if (winner !== null) {
        writeLocalRecord(winner);
      }
      return winner;
    },
    async save(document) {
      const remote = await putRemoteRecord(creds, document);
      const record: DeviceScenarioRemoteRecord = remote ?? {
        document,
        updatedAt: new Date().toISOString(),
      };
      writeLocalRecord(record);
      return record;
    },
  };
}

/** Сброс local cache (тесты). */
export function resetDeviceScenarioPersistenceForTests(): void {
  if (!canUseLocalStorage()) return;
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(LOCAL_UPDATED_AT_KEY);
}
