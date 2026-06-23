import type { DeviceBoardWorkspaceHost } from '@membrana/device-board';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { createDeviceBoardWorkspaceHost } from './createDeviceBoardWorkspaceHost.js';
import { createMediaDeviceBoardWorkspaceHost } from './createMediaDeviceBoardWorkspaceHost.js';
import {
  fetchRemoteWorkspaceList,
  isDeviceWorkspacesApiAvailable,
} from './device-workspaces-api.js';
import {
  hydratePairedWorkspaceLocalCacheIfEmpty,
  reconcilePairedWorkspaceLocalCache,
} from './hydrate-paired-workspace-local-cache.js';

type HostMode = 'unknown' | 'remote' | 'local';

/**
 * Paired host: media multi-workspace when available (remote-first), else IndexedDB legacy.
 * U11 S2-W1: re-probe media after transient failures; local only when workspaces API 404.
 */
export function createHybridDeviceBoardWorkspaceHost(
  deviceId: string,
  creds: PairedNodeCredentials,
  maxUserWorkspaces: number,
): DeviceBoardWorkspaceHost {
  const local = createDeviceBoardWorkspaceHost(deviceId, maxUserWorkspaces);
  const remote = createMediaDeviceBoardWorkspaceHost(creds, maxUserWorkspaces);
  let mode: HostMode = 'unknown';
  let modePromise: Promise<HostMode> | null = null;

  async function resolveMode(): Promise<HostMode> {
    if (mode !== 'unknown') {
      return mode;
    }
    if (modePromise === null) {
      modePromise = (async (): Promise<HostMode> => {
        if (await isDeviceWorkspacesApiAvailable(creds)) {
          mode = 'remote';
          return mode;
        }
        const list = await fetchRemoteWorkspaceList(creds);
        if (list !== null) {
          mode = 'remote';
          return mode;
        }
        mode = 'local';
        return mode;
      })();
    }
    return modePromise;
  }

  async function pickHost(): Promise<DeviceBoardWorkspaceHost> {
    return (await resolveMode()) === 'remote' ? remote : local;
  }

  async function listWorkspacesWithRecovery(): Promise<ReturnType<DeviceBoardWorkspaceHost['listWorkspaces']>> {
    if ((await resolveMode()) === 'remote') {
      await hydratePairedWorkspaceLocalCacheIfEmpty(deviceId, creds);
      const list = await remote.listWorkspaces();
      await reconcilePairedWorkspaceLocalCache(deviceId, creds);
      return list;
    }
    return local.listWorkspaces();
  }

  async function afterRemoteMutation(): Promise<void> {
    await reconcilePairedWorkspaceLocalCache(deviceId, creds);
  }

  return {
    maxUserWorkspaces,

    async listWorkspaces() {
      return listWorkspacesWithRecovery();
    },

    async countWorkspaces() {
      if ((await resolveMode()) === 'remote') {
        const list = await listWorkspacesWithRecovery();
        return list.length;
      }
      return local.countWorkspaces();
    },

    async getActiveWorkspaceId() {
      return (await pickHost()).getActiveWorkspaceId();
    },

    async loadWorkspace(workspaceId) {
      return (await pickHost()).loadWorkspace(workspaceId);
    },

    async createWorkspace(title) {
      if ((await resolveMode()) === 'remote') {
        const created = await remote.createWorkspace(title);
        if (created !== null) {
          await afterRemoteMutation();
        }
        return created;
      }
      return local.createWorkspace(title);
    },

    async cloneWorkspaceFromUserCase(input) {
      if ((await resolveMode()) === 'remote') {
        const created = await remote.cloneWorkspaceFromUserCase(input);
        if (created !== null) {
          await afterRemoteMutation();
        }
        return created;
      }
      return local.cloneWorkspaceFromUserCase(input);
    },

    async renameWorkspace(workspaceId, title) {
      return (await pickHost()).renameWorkspace(workspaceId, title);
    },

    async deleteWorkspace(workspaceId) {
      if ((await resolveMode()) === 'remote') {
        const remoteOk = await remote.deleteWorkspace(workspaceId);
        await local.deleteWorkspace(workspaceId);
        await afterRemoteMutation();
        return remoteOk;
      }
      return local.deleteWorkspace(workspaceId);
    },

    async setActiveWorkspaceId(workspaceId) {
      if ((await resolveMode()) === 'remote') {
        await remote.setActiveWorkspaceId(workspaceId);
        await local.setActiveWorkspaceId(workspaceId);
        return;
      }
      await local.setActiveWorkspaceId(workspaceId);
    },
  };
}
