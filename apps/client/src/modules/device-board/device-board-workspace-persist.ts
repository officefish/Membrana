import {
  parseDeviceScenarioDocument,
  type DeviceScenarioDocument,
} from '@membrana/core';
import type { DeviceScenarioRemoteRecord } from '@membrana/device-board';
import { stampUserWorkspaceDocument } from '@membrana/device-board';

import {
  createDeviceBoardWorkspaceId,
  createDeviceBoardWorkspaceStore,
  type DeviceBoardWorkspaceStore,
} from './device-board-workspace-store.js';

/** Legacy single-slot keys (до U10 W3). */
export const LEGACY_DEVICE_SCENARIO_STORAGE_KEY = 'membrana.device-scenario.v1';
export const LEGACY_DEVICE_SCENARIO_UPDATED_AT_KEY = 'membrana.device-scenario.updatedAt';

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

/** Читает legacy localStorage-запись (миграция). */
export function readLegacyDeviceScenarioLocalRecord(): DeviceScenarioRemoteRecord | null {
  if (!canUseLocalStorage()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(LEGACY_DEVICE_SCENARIO_STORAGE_KEY);
    const updatedAt = localStorage.getItem(LEGACY_DEVICE_SCENARIO_UPDATED_AT_KEY);
    if (!raw || !updatedAt) {
      return null;
    }
    const parsed = parseDeviceScenarioDocument(JSON.parse(raw) as unknown);
    if (!parsed.ok) {
      return null;
    }
    return { document: parsed.value, updatedAt };
  } catch {
    return null;
  }
}

/** Удаляет legacy localStorage после успешной миграции в IndexedDB. */
export function clearLegacyDeviceScenarioLocalRecord(): void {
  if (!canUseLocalStorage()) {
    return;
  }
  localStorage.removeItem(LEGACY_DEVICE_SCENARIO_STORAGE_KEY);
  localStorage.removeItem(LEGACY_DEVICE_SCENARIO_UPDATED_AT_KEY);
}

function workspaceTitleFromDocument(
  document: DeviceScenarioDocument,
  fallback: string,
): string {
  const fromMeta = document.meta?.title?.trim();
  return fromMeta !== undefined && fromMeta.length > 0 ? fromMeta : fallback;
}

/**
 * Импортирует legacy localStorage в первый user workspace, если IndexedDB пуст.
 * @returns запись активного слота после миграции или null
 */
export async function migrateLegacyLocalStorageToWorkspaceIfEmpty(
  store: DeviceBoardWorkspaceStore,
): Promise<DeviceScenarioRemoteRecord | null> {
  const count = await store.count();
  if (count > 0) {
    return null;
  }
  const legacy = readLegacyDeviceScenarioLocalRecord();
  if (legacy === null) {
    return null;
  }
  const workspaceId = createDeviceBoardWorkspaceId();
  const title = workspaceTitleFromDocument(legacy.document, 'Сценарий 1');
  const document = stampUserWorkspaceDocument({
    ...legacy.document,
    meta: {
      ...legacy.document.meta,
      workspaceKind: 'user',
      workspaceId,
      title,
    },
  });
  await store.put({
    workspaceId,
    title,
    document,
    updatedAt: legacy.updatedAt,
  });
  await store.setActiveWorkspaceId(workspaceId);
  clearLegacyDeviceScenarioLocalRecord();
  return { document, updatedAt: legacy.updatedAt };
}

async function resolveActiveWorkspaceId(store: DeviceBoardWorkspaceStore): Promise<string | null> {
  let activeId = await store.getActiveWorkspaceId();
  if (activeId !== null) {
    const activeRecord = await store.get(activeId);
    if (activeRecord !== null) {
      return activeId;
    }
  }
  const list = await store.list();
  if (list.length === 0) {
    await store.setActiveWorkspaceId(null);
    return null;
  }
  activeId = list[0]!.workspaceId;
  await store.setActiveWorkspaceId(activeId);
  return activeId;
}

/** Загружает документ активного user workspace из IndexedDB. */
export async function loadActiveWorkspaceRecord(
  store: DeviceBoardWorkspaceStore,
): Promise<DeviceScenarioRemoteRecord | null> {
  const migrated = await migrateLegacyLocalStorageToWorkspaceIfEmpty(store);
  if (migrated !== null) {
    return migrated;
  }
  const activeId = await resolveActiveWorkspaceId(store);
  if (activeId === null) {
    return null;
  }
  const record = await store.get(activeId);
  if (record === null) {
    return null;
  }
  return { document: record.document, updatedAt: record.updatedAt };
}

/** Сохраняет документ в активный user workspace; при отсутствии слота создаёт первый. */
export async function saveActiveWorkspaceRecord(
  store: DeviceBoardWorkspaceStore,
  document: DeviceScenarioDocument,
  maxUserWorkspaces: number,
): Promise<DeviceScenarioRemoteRecord> {
  await migrateLegacyLocalStorageToWorkspaceIfEmpty(store);

  let activeId = await resolveActiveWorkspaceId(store);
  if (activeId === null) {
    const count = await store.count();
    if (count >= maxUserWorkspaces) {
      throw new Error(`Достигнут лимит user workspace (${maxUserWorkspaces})`);
    }
    activeId = createDeviceBoardWorkspaceId();
    await store.setActiveWorkspaceId(activeId);
  }

  const existing = await store.get(activeId);
  const fallbackTitle = existing?.title ?? `Сценарий ${(await store.count()) || 1}`;
  const title = workspaceTitleFromDocument(document, fallbackTitle);
  const stamped = stampUserWorkspaceDocument({
    ...document,
    meta: {
      ...document.meta,
      workspaceKind: 'user',
      workspaceId: activeId,
      title,
    },
  });
  const updatedAt = new Date().toISOString();
  await store.put({
    workspaceId: activeId,
    title,
    document: stamped,
    updatedAt,
  });
  return { document: stamped, updatedAt };
}

/** Store + persist helpers для deviceId (shared singleton DB). */
export function createDeviceBoardWorkspacePersistApi(deviceId: string, maxUserWorkspaces = 3) {
  const store = createDeviceBoardWorkspaceStore(deviceId);
  return {
    store,
    maxUserWorkspaces,
    loadActive: () => loadActiveWorkspaceRecord(store),
    saveActive: (document: DeviceScenarioDocument) =>
      saveActiveWorkspaceRecord(store, document, maxUserWorkspaces),
    migrateLegacyIfEmpty: () => migrateLegacyLocalStorageToWorkspaceIfEmpty(store),
  };
}
