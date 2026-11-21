import { parseDeviceScenarioDocument, type DeviceScenarioDocument } from '@membrana/core';
import type { DeviceBoardPersistAdapter, DeviceScenarioRemoteRecord } from '@membrana/device-board';

import { cabinetDeviceUrl, cabinetSessionHeaders } from '@/lib/cabinetMediaAccess';

/** Сценарий доски прибора — через сервер кабинета, сессией пользователя. */
function scenarioUrl(deviceId: string): string {
  return cabinetDeviceUrl(deviceId, '/device-scenario');
}

function requestHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json', ...cabinetSessionHeaders() };
}

export async function fetchDeviceScenarioRecord(
  deviceId: string,
): Promise<DeviceScenarioRemoteRecord | null> {
  const res = await fetch(scenarioUrl(deviceId), {
    method: 'GET',
    headers: requestHeaders(),
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
  const res = await fetch(scenarioUrl(deviceId), {
    method: 'PUT',
    headers: requestHeaders(),
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
