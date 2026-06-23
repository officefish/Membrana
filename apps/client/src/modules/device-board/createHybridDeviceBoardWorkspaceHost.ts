import type { DeviceBoardWorkspaceHost } from '@membrana/device-board';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { createDeviceBoardWorkspaceHost } from './createDeviceBoardWorkspaceHost.js';
import { createMediaDeviceBoardWorkspaceHost } from './createMediaDeviceBoardWorkspaceHost.js';
import {
  fetchRemoteWorkspaceList,
  isDeviceWorkspacesApiAvailable,
} from './device-workspaces-api.js';
import { hydratePairedWorkspaceLocalCacheIfEmpty } from './hydrate-paired-workspace-local-cache.js';

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
    }
    return (await pickHost()).listWorkspaces();
  }

  return {
    maxUserWorkspaces,

    async listWorkspaces() {
      return listWorkspacesWithRecovery();
    },

    async countWorkspaces() {
      return (await pickHost()).countWorkspaces();
    },

    async getActiveWorkspaceId() {
      return (await pickHost()).getActiveWorkspaceId();
    },

    async loadWorkspace(workspaceId) {
      return (await pickHost()).loadWorkspace(workspaceId);
    },

    async createWorkspace(title) {
      return (await pickHost()).createWorkspace(title);
    },

    async cloneWorkspaceFromUserCase(input) {
      return (await pickHost()).cloneWorkspaceFromUserCase(input);
    },

    async renameWorkspace(workspaceId, title) {
      return (await pickHost()).renameWorkspace(workspaceId, title);
    },

    async deleteWorkspace(workspaceId) {
      return (await pickHost()).deleteWorkspace(workspaceId);
    },

    async setActiveWorkspaceId(workspaceId) {
      return (await pickHost()).setActiveWorkspaceId(workspaceId);
    },
  };
}
