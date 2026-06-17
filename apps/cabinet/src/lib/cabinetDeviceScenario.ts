import { parseDeviceScenarioDocument, type DeviceScenarioDocument } from '@membrana/core';
import type { DeviceBoardPersistAdapter, DeviceScenarioRemoteRecord } from '@membrana/device-board';

import { fetchMediaSession, type MediaSession } from '@/api/sampleLibrary';
import { resolveCabinetMediaApiBase } from '@/lib/cabinetMediaLibrary';

async function getSession(): Promise<MediaSession> {
  return fetchMediaSession();
}

function scenarioUrl(session: MediaSession, deviceId: string): string {
  const base = resolveCabinetMediaApiBase(session.mediaApiUrl);
  return `${base}/v1/devices/${encodeURIComponent(deviceId)}/device-scenario`;
}

function mediaHeaders(session: MediaSession, deviceId: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Membrana-Token': session.mediaToken,
    'X-Membrana-Device-Id': deviceId,
  };
}

export async function fetchDeviceScenarioRecord(
  deviceId: string,
): Promise<DeviceScenarioRemoteRecord | null> {
  const session = await getSession();
  const res = await fetch(scenarioUrl(session, deviceId), {
    method: 'GET',
    headers: mediaHeaders(session, deviceId),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Не удалось загрузить сценарий (${res.status})`);
  }
  const body = (await res.json()) as DeviceScenarioRemoteRecord;
  const parsed = parseDeviceScenarioDocument(body.document);
  if (!parsed.ok) {
    throw new Error(parsed.error.message);
  }
  return { document: parsed.value, updatedAt: body.updatedAt };
}

export async function putDeviceScenarioRecord(
  deviceId: string,
  document: DeviceScenarioDocument,
): Promise<DeviceScenarioRemoteRecord> {
  const session = await getSession();
  const res = await fetch(scenarioUrl(session, deviceId), {
    method: 'PUT',
    headers: mediaHeaders(session, deviceId),
    body: JSON.stringify(document),
  });
  if (!res.ok) {
    throw new Error(`Не удалось сохранить сценарий (${res.status})`);
  }
  const body = (await res.json()) as DeviceScenarioRemoteRecord;
  const parsed = parseDeviceScenarioDocument(body.document);
  if (!parsed.ok) {
    throw new Error(parsed.error.message);
  }
  return { document: parsed.value, updatedAt: body.updatedAt };
}

export function createCabinetDeviceBoardPersistAdapter(deviceId: string): DeviceBoardPersistAdapter {
  return {
    load: () => fetchDeviceScenarioRecord(deviceId),
    save: (document) => putDeviceScenarioRecord(deviceId, document),
  };
}
