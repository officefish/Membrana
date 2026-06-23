import type { DeviceBoardWorkspaceHost } from '@membrana/device-board';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { createDeviceBoardWorkspaceHost } from './createDeviceBoardWorkspaceHost.js';
import { createMediaDeviceBoardWorkspaceHost } from './createMediaDeviceBoardWorkspaceHost.js';
import { isDeviceWorkspacesApiAvailable } from './device-workspaces-api.js';

type HostMode = 'unknown' | 'remote' | 'local';

/** Paired host: media multi-workspace when available, else IndexedDB (legacy media). */
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
      modePromise = isDeviceWorkspacesApiAvailable(creds).then((available) => {
        mode = available ? 'remote' : 'local';
        return mode;
      });
    }
    return modePromise;
  }

  async function pickHost(): Promise<DeviceBoardWorkspaceHost> {
    return (await resolveMode()) === 'remote' ? remote : local;
  }

  return {
    maxUserWorkspaces,

    async listWorkspaces() {
      return (await pickHost()).listWorkspaces();
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
