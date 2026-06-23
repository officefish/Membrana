import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { createHybridDeviceBoardWorkspaceHost } from './createHybridDeviceBoardWorkspaceHost.js';
import * as deviceWorkspacesApi from './device-workspaces-api.js';
import * as hydrateModule from './hydrate-paired-workspace-local-cache.js';
import * as localHostModule from './createDeviceBoardWorkspaceHost.js';
import * as mediaHostModule from './createMediaDeviceBoardWorkspaceHost.js';

const CREDS: PairedNodeCredentials = {
  deviceId: 'dev-hybrid-2',
  mediaApiUrl: 'https://media.example',
  mediaToken: 'token-b',
  cabinetApiUrl: 'https://cabinet.example',
  accessKey: 'key',
};

describe('createHybridDeviceBoardWorkspaceHost (U11 S2-W1)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    deviceWorkspacesApi.resetDeviceWorkspacesApiCacheForTests();
  });

  it('uses remote host when workspaces API is available', async () => {
    vi.spyOn(hydrateModule, 'hydratePairedWorkspaceLocalCacheIfEmpty').mockResolvedValue(false);
    const remoteList = [{ workspaceId: 'ws-1', title: 'Remote', updatedAt: '2026-06-23T00:00:00.000Z' }];
    vi.spyOn(deviceWorkspacesApi, 'isDeviceWorkspacesApiAvailable').mockResolvedValue(true);
    vi.spyOn(localHostModule, 'createDeviceBoardWorkspaceHost').mockReturnValue({
      maxUserWorkspaces: 3,
      listWorkspaces: vi.fn().mockResolvedValue([]),
      countWorkspaces: vi.fn(),
      getActiveWorkspaceId: vi.fn(),
      loadWorkspace: vi.fn(),
      createWorkspace: vi.fn(),
      cloneWorkspaceFromUserCase: vi.fn(),
      renameWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
      setActiveWorkspaceId: vi.fn(),
    });
    const remoteListFn = vi.fn().mockResolvedValue(remoteList);
    vi.spyOn(mediaHostModule, 'createMediaDeviceBoardWorkspaceHost').mockReturnValue({
      maxUserWorkspaces: 3,
      listWorkspaces: remoteListFn,
      countWorkspaces: vi.fn(),
      getActiveWorkspaceId: vi.fn(),
      loadWorkspace: vi.fn(),
      createWorkspace: vi.fn(),
      cloneWorkspaceFromUserCase: vi.fn(),
      renameWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
      setActiveWorkspaceId: vi.fn(),
    });

    const host = createHybridDeviceBoardWorkspaceHost(CREDS.deviceId, CREDS, 3);
    await expect(host.listWorkspaces()).resolves.toEqual(remoteList);
    expect(remoteListFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to local when API probe and list both fail', async () => {
    vi.spyOn(hydrateModule, 'hydratePairedWorkspaceLocalCacheIfEmpty').mockResolvedValue(false);
    vi.spyOn(deviceWorkspacesApi, 'isDeviceWorkspacesApiAvailable').mockResolvedValue(false);
    vi.spyOn(deviceWorkspacesApi, 'fetchRemoteWorkspaceList').mockResolvedValue(null);
    const localList = [{ workspaceId: 'local-1', title: 'Local', updatedAt: '2026-06-23T00:00:00.000Z' }];
    const localListFn = vi.fn().mockResolvedValue(localList);
    vi.spyOn(localHostModule, 'createDeviceBoardWorkspaceHost').mockReturnValue({
      maxUserWorkspaces: 3,
      listWorkspaces: localListFn,
      countWorkspaces: vi.fn(),
      getActiveWorkspaceId: vi.fn(),
      loadWorkspace: vi.fn(),
      createWorkspace: vi.fn(),
      cloneWorkspaceFromUserCase: vi.fn(),
      renameWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
      setActiveWorkspaceId: vi.fn(),
    });
    vi.spyOn(mediaHostModule, 'createMediaDeviceBoardWorkspaceHost').mockReturnValue({
      maxUserWorkspaces: 3,
      listWorkspaces: vi.fn().mockResolvedValue([]),
      countWorkspaces: vi.fn(),
      getActiveWorkspaceId: vi.fn(),
      loadWorkspace: vi.fn(),
      createWorkspace: vi.fn(),
      cloneWorkspaceFromUserCase: vi.fn(),
      renameWorkspace: vi.fn(),
      deleteWorkspace: vi.fn(),
      setActiveWorkspaceId: vi.fn(),
    });

    const host = createHybridDeviceBoardWorkspaceHost(CREDS.deviceId, CREDS, 3);
    await expect(host.listWorkspaces()).resolves.toEqual(localList);
    expect(localListFn).toHaveBeenCalledTimes(1);
  });
});
