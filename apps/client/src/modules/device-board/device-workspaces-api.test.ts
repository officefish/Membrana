import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PairedNodeCredentials } from '@/lib/nodeConnectionMode';

import {
  invalidateDeviceWorkspacesApiCache,
  isDeviceWorkspacesApiAvailable,
  resetDeviceWorkspacesApiCacheForTests,
} from './device-workspaces-api.js';

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
