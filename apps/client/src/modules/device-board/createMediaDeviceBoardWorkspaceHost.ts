import { createEmptyDeviceScenarioDocument } from '@membrana/core';
import {
  cloneUserCaseToWorkspaceDocument,
  stampUserWorkspaceDocument,
  type DeviceBoardWorkspaceHost,
} from '@membrana/device-board';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { createDeviceBoardWorkspaceId } from './device-board-workspace-store.js';
import {
  deleteRemoteWorkspace,
  fetchRemoteWorkspaceList,
  fetchRemoteWorkspaceRecord,
  putRemoteWorkspaceRecord,
  setRemoteActiveWorkspaceId,
} from './device-workspaces-api.js';

/** Media-backed {@link DeviceBoardWorkspaceHost} (U10 W5 paired). */
export function createMediaDeviceBoardWorkspaceHost(
  creds: PairedNodeCredentials,
  maxUserWorkspaces: number,
): DeviceBoardWorkspaceHost {
  return {
    maxUserWorkspaces,

    async listWorkspaces() {
      const list = await fetchRemoteWorkspaceList(creds);
      return list?.workspaces ?? [];
    },

    async countWorkspaces() {
      const list = await fetchRemoteWorkspaceList(creds);
      return list?.workspaces.length ?? 0;
    },

    async getActiveWorkspaceId() {
      const list = await fetchRemoteWorkspaceList(creds);
      return list?.activeWorkspaceId ?? null;
    },

    async loadWorkspace(workspaceId) {
      const record = await fetchRemoteWorkspaceRecord(creds, workspaceId);
      return record?.document ?? null;
    },

    async createWorkspace(title) {
      const list = await fetchRemoteWorkspaceList(creds);
      const count = list?.workspaces.length ?? 0;
      if (count >= maxUserWorkspaces) {
        return null;
      }
      const workspaceId = createDeviceBoardWorkspaceId();
      const trimmedTitle = title.trim() || `Сценарий ${count + 1}`;
      const document = stampUserWorkspaceDocument({
        ...createEmptyDeviceScenarioDocument('microphone'),
        meta: {
          workspaceKind: 'user',
          workspaceId,
          title: trimmedTitle,
        },
      });
      const saved = await putRemoteWorkspaceRecord(creds, workspaceId, document);
      if (list?.activeWorkspaceId === null) {
        await setRemoteActiveWorkspaceId(creds, workspaceId);
      }
      return { workspaceId, document: saved.document };
    },

    async cloneWorkspaceFromUserCase(input) {
      const list = await fetchRemoteWorkspaceList(creds);
      const count = list?.workspaces.length ?? 0;
      if (count >= maxUserWorkspaces) {
        return null;
      }
      const workspaceId = createDeviceBoardWorkspaceId();
      const trimmedTitle =
        input.title?.trim() ||
        input.sourceDocument.meta?.title?.trim() ||
        `Клон ${input.userCaseId}`;
      const document = cloneUserCaseToWorkspaceDocument({
        sourceDocument: input.sourceDocument,
        userCaseId: input.userCaseId,
        workspaceId,
        title: trimmedTitle,
      });
      const saved = await putRemoteWorkspaceRecord(creds, workspaceId, document);
      return { workspaceId, document: saved.document };
    },

    async renameWorkspace(workspaceId, title) {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) {
        return false;
      }
      const existing = await fetchRemoteWorkspaceRecord(creds, workspaceId);
      if (existing === null) {
        return false;
      }
      const document = stampUserWorkspaceDocument({
        ...existing.document,
        meta: {
          ...existing.document.meta,
          title: trimmedTitle,
        },
      });
      const saved = await putRemoteWorkspaceRecord(creds, workspaceId, document, {
        expectedUpdatedAt: existing.updatedAt,
      });
      return saved !== null;
    },

    async deleteWorkspace(workspaceId) {
      return deleteRemoteWorkspace(creds, workspaceId);
    },

    async setActiveWorkspaceId(workspaceId) {
      await setRemoteActiveWorkspaceId(creds, workspaceId);
    },
  };
}
