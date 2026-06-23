import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEmptyDeviceScenarioDocument } from '@membrana/core';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import {
  invalidateDeviceWorkspacesApiCache,
  isDeviceWorkspacesApiAvailable,
  putRemoteWorkspaceRecord,
  resetDeviceWorkspacesApiCacheForTests,
} from './device-workspaces-api.js';
import { WorkspacePersistConflictError } from './workspace-persist-conflict.js';

const CREDS: PairedNodeCredentials = {
  deviceId: 'dev-hybrid-1',
  mediaApiUrl: 'https://media.example',
  mediaToken: 'token-a',
  cabinetApiUrl: 'https://cabinet.example',
  accessKey: 'key',
};

describe('device-workspaces-api availability cache (U11 S2-W1)', () => {
  afterEach(() => {
    resetDeviceWorkspacesApiCacheForTests();
    vi.unstubAllGlobals();
  });

  it('caches true but retries after transient failure', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ status: 200, ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await expect(isDeviceWorkspacesApiAvailable(CREDS)).resolves.toBe(false);
    await expect(isDeviceWorkspacesApiAvailable(CREDS)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('invalidateDeviceWorkspacesApiCache clears positive cache', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 200, ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await expect(isDeviceWorkspacesApiAvailable(CREDS)).resolves.toBe(true);
    invalidateDeviceWorkspacesApiCache(CREDS.deviceId);
    await expect(isDeviceWorkspacesApiAvailable(CREDS)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('putRemoteWorkspaceRecord LWW (U11 S3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends expectedUpdatedAt query and throws WorkspacePersistConflictError on 409', async () => {
    const document = createEmptyDeviceScenarioDocument('microphone');
    const fetchMock = vi.fn().mockResolvedValue({
      status: 409,
      ok: false,
      json: async () => ({
        code: 'WORKSPACE_CONFLICT',
        currentUpdatedAt: '2026-06-23T12:00:00.000Z',
        expectedUpdatedAt: '2026-06-23T11:00:00.000Z',
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      putRemoteWorkspaceRecord(CREDS, 'ws-1', document, {
        expectedUpdatedAt: '2026-06-23T11:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(WorkspacePersistConflictError);

    const calledUrl = fetchMock.mock.calls[0]![0] as string;
    expect(calledUrl).toContain('expectedUpdatedAt=2026-06-23T11%3A00%3A00.000Z');
  });
});
