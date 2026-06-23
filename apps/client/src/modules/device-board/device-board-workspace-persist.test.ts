import 'fake-indexeddb/auto';

import { getDefaultMvpMicrophoneDocument } from '@membrana/device-board';
import { afterEach, describe, expect, it } from 'vitest';

import {
  clearLegacyDeviceScenarioLocalRecord,
  LEGACY_DEVICE_SCENARIO_STORAGE_KEY,
  LEGACY_DEVICE_SCENARIO_UPDATED_AT_KEY,
  loadActiveWorkspaceRecord,
  migrateLegacyLocalStorageToWorkspaceIfEmpty,
  readLegacyDeviceScenarioLocalRecord,
  saveActiveWorkspaceRecord,
} from './device-board-workspace-persist.js';
import {
  closeDeviceBoardWorkspaceDatabaseForTests,
  createDeviceBoardWorkspaceStore,
  DEVICE_BOARD_WORKSPACE_DB_NAME,
} from './device-board-workspace-store.js';

const DEVICE_ID = 'persist-test-device';

function installMemoryStorage(): Map<string, string> {
  const store = new Map<string, string>();
  const mock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
  // @ts-expect-error test stub
  globalThis.localStorage = mock;
  return store;
}

async function deleteTestDatabase(): Promise<void> {
  await closeDeviceBoardWorkspaceDatabaseForTests();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DEVICE_BOARD_WORKSPACE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('device-board-workspace-persist', () => {
  afterEach(async () => {
    await deleteTestDatabase();
  });

  it('migrateLegacyLocalStorageToWorkspaceIfEmpty imports legacy localStorage once', async () => {
    const memory = installMemoryStorage();
    const document = getDefaultMvpMicrophoneDocument();
    const updatedAt = '2026-06-23T08:00:00.000Z';
    memory.set(LEGACY_DEVICE_SCENARIO_STORAGE_KEY, JSON.stringify(document));
    memory.set(LEGACY_DEVICE_SCENARIO_UPDATED_AT_KEY, updatedAt);

    const store = createDeviceBoardWorkspaceStore(DEVICE_ID);
    const migrated = await migrateLegacyLocalStorageToWorkspaceIfEmpty(store);
    expect(migrated?.document.deviceKind).toBe('microphone');
    expect(migrated?.document.meta?.workspaceKind).toBe('user');
    expect(readLegacyDeviceScenarioLocalRecord()).toBeNull();
    expect(await store.count()).toBe(1);
    expect(await store.getActiveWorkspaceId()).not.toBeNull();

    const secondPass = await migrateLegacyLocalStorageToWorkspaceIfEmpty(store);
    expect(secondPass).toBeNull();
    expect(await store.count()).toBe(1);
  });

  it('loadActiveWorkspaceRecord returns migrated legacy document', async () => {
    const memory = installMemoryStorage();
    const document = getDefaultMvpMicrophoneDocument();
    memory.set(LEGACY_DEVICE_SCENARIO_STORAGE_KEY, JSON.stringify(document));
    memory.set(LEGACY_DEVICE_SCENARIO_UPDATED_AT_KEY, '2026-06-23T09:00:00.000Z');

    const store = createDeviceBoardWorkspaceStore(DEVICE_ID);
    const loaded = await loadActiveWorkspaceRecord(store);
    expect(loaded?.document.meta?.workspaceKind).toBe('user');
    expect(memory.has(LEGACY_DEVICE_SCENARIO_STORAGE_KEY)).toBe(false);
  });

  it('saveActiveWorkspaceRecord creates first slot when none exist', async () => {
    installMemoryStorage();
    clearLegacyDeviceScenarioLocalRecord();
    const store = createDeviceBoardWorkspaceStore(DEVICE_ID);
    const document = getDefaultMvpMicrophoneDocument();
    const saved = await saveActiveWorkspaceRecord(store, document, 3);
    expect(saved.document.meta?.workspaceKind).toBe('user');
    expect(await store.count()).toBe(1);
    const reloaded = await loadActiveWorkspaceRecord(store);
    expect(reloaded?.updatedAt).toBe(saved.updatedAt);
  });
});
