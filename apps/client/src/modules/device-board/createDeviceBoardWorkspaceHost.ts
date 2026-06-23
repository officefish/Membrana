import { createEmptyDeviceScenarioDocument } from '@membrana/core';
import {
  stampUserWorkspaceDocument,
  type DeviceBoardWorkspaceHost,
} from '@membrana/device-board';

import {
  createDeviceBoardWorkspaceId,
  createDeviceBoardWorkspaceStore,
} from './device-board-workspace-store.js';

const DEFAULT_MAX_USER_WORKSPACES = 3;

/** IndexedDB-реализация {@link DeviceBoardWorkspaceHost} (U10 W1–W2). */
export function createDeviceBoardWorkspaceHost(
  deviceId: string,
  maxUserWorkspaces: number = DEFAULT_MAX_USER_WORKSPACES,
): DeviceBoardWorkspaceHost {
  const store = createDeviceBoardWorkspaceStore(deviceId);

  return {
    maxUserWorkspaces,

    async listWorkspaces() {
      return store.list();
    },

    async countWorkspaces() {
      return store.count();
    },

    async getActiveWorkspaceId() {
      return store.getActiveWorkspaceId();
    },

    async loadWorkspace(workspaceId) {
      const record = await store.get(workspaceId);
      return record?.document ?? null;
    },

    async createWorkspace(title) {
      const count = await store.count();
      if (count >= maxUserWorkspaces) {
        return null;
      }
      const workspaceId = createDeviceBoardWorkspaceId();
      const trimmedTitle = title.trim() || `Сценарий ${count + 1}`;
      const updatedAt = new Date().toISOString();
      const document = stampUserWorkspaceDocument({
        ...createEmptyDeviceScenarioDocument('microphone'),
        meta: {
          workspaceKind: 'user',
          workspaceId,
          title: trimmedTitle,
        },
      });
      await store.put({
        workspaceId,
        title: trimmedTitle,
        document,
        updatedAt,
      });
      return { workspaceId, document };
    },

    async renameWorkspace(workspaceId, title) {
      const record = await store.get(workspaceId);
      if (record === null) {
        return false;
      }
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        return false;
      }
      await store.put({
        workspaceId,
        title: trimmedTitle,
        document: {
          ...record.document,
          meta: {
            ...record.document.meta,
            title: trimmedTitle,
          },
        },
        updatedAt: new Date().toISOString(),
      });
      return true;
    },

    async deleteWorkspace(workspaceId) {
      const record = await store.get(workspaceId);
      if (record === null) {
        return false;
      }
      await store.delete(workspaceId);
      return true;
    },

    async setActiveWorkspaceId(workspaceId) {
      await store.setActiveWorkspaceId(workspaceId);
    },
  };
}
