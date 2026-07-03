import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getClientRuntimeVersion,
  notifyStudioCaptureAcquired,
  prefetchStudioAppVersion,
  resetStudioShellPortForTests,
} from '@/lib/electronStudioShellPort';

describe('electronStudioShellPort (SC1/SC5)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetStudioShellPortForTests();
  });

  it('в node/браузере без electronAPI — no-op и маркер web', () => {
    expect(() => notifyStudioCaptureAcquired()).not.toThrow();
    prefetchStudioAppVersion();
    expect(getClientRuntimeVersion()).toBe('web');
  });

  it('в студии prefetch кэширует версию → studio-<semver>', async () => {
    vi.stubGlobal('window', {
      electronAPI: {
        studioShell: {
          notifyCaptureAcquired: vi.fn(),
          getAppVersion: () => Promise.resolve('0.3.1'),
        },
      },
    });
    prefetchStudioAppVersion();
    await vi.waitFor(() => {
      expect(getClientRuntimeVersion()).toBe('studio-0.3.1');
    });
  });

  it('старый preload без getAppVersion — остаёмся web', () => {
    vi.stubGlobal('window', {
      electronAPI: { studioShell: { notifyCaptureAcquired: vi.fn() } },
    });
    prefetchStudioAppVersion();
    expect(getClientRuntimeVersion()).toBe('web');
  });
});
