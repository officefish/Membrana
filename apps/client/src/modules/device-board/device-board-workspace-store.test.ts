import 'fake-indexeddb/auto';

import { afterEach, describe, expect, it } from 'vitest';
import { getDefaultMvpMicrophoneDocument } from '@membrana/device-board';

import {
  buildWorkspaceStorageKey,
  closeDeviceBoardWorkspaceDatabaseForTests,
  createDeviceBoardWorkspaceId,
  createDeviceBoardWorkspaceStore,
  DEVICE_BOARD_WORKSPACE_DB_NAME,
} from './device-board-workspace-store.js';

const DEVICE_ID = 'test-device-1';

async function deleteTestDatabase(): Promise<void> {
  await closeDeviceBoardWorkspaceDatabaseForTests();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DEVICE_BOARD_WORKSPACE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('device-board-workspace-store', () => {
  afterEach(async () => {
    await deleteTestDatabase();
  });

  it('buildWorkspaceStorageKey is stable per device and workspace', () => {
    expect(buildWorkspaceStorageKey('dev-a', 'ws-1')).toBe('dev-a\u0000ws-1');
  });

  it('createDeviceBoardWorkspaceId returns user-ws prefix', () => {
    expect(createDeviceBoardWorkspaceId()).toMatch(/^user-ws-/);
  });

  it('put/get/list round-trip workspace record', async () => {
    const store = createDeviceBoardWorkspaceStore(DEVICE_ID);
    const workspaceId = 'ws-alpha';
    const document = getDefaultMvpMicrophoneDocument();
    const updatedAt = '2026-06-23T10:00:00.000Z';

    await store.put({
      workspaceId,
      title: 'My mic board',
      document,
      updatedAt,
    });

    const loaded = await store.get(workspaceId);
    expect(loaded?.workspaceId).toBe(workspaceId);
    expect(loaded?.title).toBe('My mic board');
    expect(loaded?.document.deviceKind).toBe('microphone');

    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.workspaceId).toBe(workspaceId);
    expect(await store.count()).toBe(1);
  });

  it('delete removes workspace and clears active id when needed', async () => {
    const store = createDeviceBoardWorkspaceStore(DEVICE_ID);
    const workspaceId = 'ws-beta';
    await store.put({
      workspaceId,
      title: 'To delete',
      document: getDefaultMvpMicrophoneDocument(),
      updatedAt: '2026-06-23T11:00:00.000Z',
    });
    await store.setActiveWorkspaceId(workspaceId);
    expect(await store.getActiveWorkspaceId()).toBe(workspaceId);

    await store.delete(workspaceId);
    expect(await store.get(workspaceId)).toBeNull();
    expect(await store.getActiveWorkspaceId()).toBeNull();
    expect(await store.count()).toBe(0);
  });

  it('isolates workspaces by deviceId', async () => {
    const storeA = createDeviceBoardWorkspaceStore('device-a');
    const storeB = createDeviceBoardWorkspaceStore('device-b');
    const sharedWorkspaceId = 'shared-id';

    await storeA.put({
      workspaceId: sharedWorkspaceId,
      title: 'A',
      document: getDefaultMvpMicrophoneDocument(),
      updatedAt: '2026-06-23T12:00:00.000Z',
    });
    await storeB.put({
      workspaceId: sharedWorkspaceId,
      title: 'B',
      document: getDefaultMvpMicrophoneDocument(),
      updatedAt: '2026-06-23T12:01:00.000Z',
    });

    expect((await storeA.get(sharedWorkspaceId))?.title).toBe('A');
    expect((await storeB.get(sharedWorkspaceId))?.title).toBe('B');
    expect(await storeA.count()).toBe(1);
    expect(await storeB.count()).toBe(1);
  });

  it('setActiveWorkspaceId persists per device', async () => {
    const store = createDeviceBoardWorkspaceStore(DEVICE_ID);
    await store.setActiveWorkspaceId('ws-active');
    expect(await store.getActiveWorkspaceId()).toBe('ws-active');

    const other = createDeviceBoardWorkspaceStore('other-device');
    expect(await other.getActiveWorkspaceId()).toBeNull();
  });
});
