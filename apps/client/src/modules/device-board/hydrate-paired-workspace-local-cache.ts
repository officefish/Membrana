import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import { createDeviceBoardWorkspaceStore } from './device-board-workspace-store.js';
import {
  fetchRemoteWorkspaceList,
  fetchRemoteWorkspaceRecord,
} from './device-workspaces-api.js';

/**
 * When IndexedDB is empty but media has workspaces (reinstall / new browser profile),
 * hydrate local cache so persist adapter and offline reads stay consistent (U11 S2-W2).
 *
 * @returns true when at least one workspace was copied from media
 */
export async function hydratePairedWorkspaceLocalCacheIfEmpty(
  deviceId: string,
  creds: PairedNodeCredentials,
): Promise<boolean> {
  const store = createDeviceBoardWorkspaceStore(deviceId);
  if ((await store.count()) > 0) {
    return false;
  }

  const list = await fetchRemoteWorkspaceList(creds);
  if (list === null || list.workspaces.length === 0) {
    return false;
  }

  let hydrated = false;
  for (const item of list.workspaces) {
    const record = await fetchRemoteWorkspaceRecord(creds, item.workspaceId);
    if (record === null) {
      continue;
    }
    await store.put({
      workspaceId: item.workspaceId,
      title: item.title,
      document: record.document,
      updatedAt: record.updatedAt,
    });
    hydrated = true;
  }

  if (list.activeWorkspaceId !== null) {
    await store.setActiveWorkspaceId(list.activeWorkspaceId);
  }

  return hydrated;
}

/**
 * Align IndexedDB cache with media list (remote-first SoT).
 * Drops local-only orphans after remote delete; refreshes stale rows (U11 fix).
 */
export async function reconcilePairedWorkspaceLocalCache(
  deviceId: string,
  creds: PairedNodeCredentials,
): Promise<void> {
  const list = await fetchRemoteWorkspaceList(creds);
  if (list === null) {
    return;
  }

  const store = createDeviceBoardWorkspaceStore(deviceId);
  const localItems = await store.list();
  const remoteIds = new Set(list.workspaces.map((item) => item.workspaceId));

  for (const item of localItems) {
    if (!remoteIds.has(item.workspaceId)) {
      await store.delete(item.workspaceId);
    }
  }

  for (const item of list.workspaces) {
    const record = await fetchRemoteWorkspaceRecord(creds, item.workspaceId);
    if (record === null) {
      continue;
    }
    const existing = await store.get(item.workspaceId);
    if (existing === null || existing.updatedAt !== record.updatedAt) {
      await store.put({
        workspaceId: item.workspaceId,
        title: item.title,
        document: record.document,
        updatedAt: record.updatedAt,
      });
    }
  }

  await store.setActiveWorkspaceId(list.activeWorkspaceId);
}
