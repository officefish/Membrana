import 'fake-indexeddb/auto';

import { getDefaultMvpMicrophoneDocument } from '@membrana/device-board';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import {
  closeDeviceBoardWorkspaceDatabaseForTests,
  DEVICE_BOARD_WORKSPACE_DB_NAME,
  createDeviceBoardWorkspaceStore,
} from './device-board-workspace-store.js';
import * as deviceWorkspacesApi from './device-workspaces-api.js';
import { hydratePairedWorkspaceLocalCacheIfEmpty } from './hydrate-paired-workspace-local-cache.js';

const DEVICE_ID = 'hydrate-test-device';
const CREDS: PairedNodeCredentials = {
  deviceId: DEVICE_ID,
  mediaApiUrl: 'https://media.example',
  mediaToken: 'token-h',
  cabinetApiUrl: 'https://cabinet.example',
  accessKey: 'key',
};

async function deleteTestDatabase(): Promise<void> {
  await closeDeviceBoardWorkspaceDatabaseForTests();
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DEVICE_BOARD_WORKSPACE_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe('hydratePairedWorkspaceLocalCacheIfEmpty (U11 S2-W2)', () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await deleteTestDatabase();
  });

  it('copies remote workspaces when local IndexedDB is empty', async () => {
    const document = getDefaultMvpMicrophoneDocument();
    vi.spyOn(deviceWorkspacesApi, 'fetchRemoteWorkspaceList').mockResolvedValue({
      activeWorkspaceId: 'ws-remote-1',
      workspaces: [
        {
          workspaceId: 'ws-remote-1',
          title: 'From media',
          updatedAt: '2026-06-23T10:00:00.000Z',
        },
      ],
    });
    vi.spyOn(deviceWorkspacesApi, 'fetchRemoteWorkspaceRecord').mockResolvedValue({
      document,
      updatedAt: '2026-06-23T10:00:00.000Z',
    });

    await expect(hydratePairedWorkspaceLocalCacheIfEmpty(DEVICE_ID, CREDS)).resolves.toBe(true);

    const store = createDeviceBoardWorkspaceStore(DEVICE_ID);
    await expect(store.count()).resolves.toBe(1);
    await expect(store.getActiveWorkspaceId()).resolves.toBe('ws-remote-1');
    const record = await store.get('ws-remote-1');
    expect(record?.document.deviceKind).toBe('microphone');
  });

  it('is a no-op when local cache already has workspaces', async () => {
    const store = createDeviceBoardWorkspaceStore(DEVICE_ID);
    const document = getDefaultMvpMicrophoneDocument();
    await store.put({
      workspaceId: 'ws-local',
      title: 'Local',
      document,
      updatedAt: '2026-06-23T09:00:00.000Z',
    });

    const listSpy = vi.spyOn(deviceWorkspacesApi, 'fetchRemoteWorkspaceList');

    await expect(hydratePairedWorkspaceLocalCacheIfEmpty(DEVICE_ID, CREDS)).resolves.toBe(false);
    expect(listSpy).not.toHaveBeenCalled();
  });
});
