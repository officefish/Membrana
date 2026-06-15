import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  resetDefaultLiveJournalServiceForTests,
} from '@membrana/telemetry-journal-service';

import {
  initJournalHubBridge,
  reconfigureJournalFromConnection,
  resetJournalHubBridgeForTests,
} from './journalHubBridge';
import { resolveJournalBackend } from './resolveJournalBackend';

vi.mock('./resolveJournalBackend', () => ({
  resolveJournalBackend: vi.fn(),
}));

const sampleImportedListeners: Array<(payload: unknown) => void> = [];

vi.mock('./mediaLibraryHub', () => ({
  subscribeMediaLibrarySampleImported: vi.fn((listener: (payload: unknown) => void) => {
    sampleImportedListeners.push(listener);
    return () => {
      const index = sampleImportedListeners.indexOf(listener);
      if (index >= 0) sampleImportedListeners.splice(index, 1);
    };
  }),
}));

describe('journalHubBridge', () => {
  afterEach(() => {
    resetJournalHubBridgeForTests();
    resetDefaultLiveJournalServiceForTests();
    vi.mocked(resolveJournalBackend).mockReset();
    sampleImportedListeners.length = 0;
  });

  it('configures default live journal service from resolved backend', async () => {
    const backend = createMemoryJournalStorageBackend();
    vi.mocked(resolveJournalBackend).mockResolvedValue(backend);

    initJournalHubBridge();
    await reconfigureJournalFromConnection();

    expect(getDefaultLiveJournalService().getSnapshot().storageMode).toBe('browser-limited-fallback');
  });

  it('refreshes live journal after sample.imported hub event (TJ7)', async () => {
    const backend = createMemoryJournalStorageBackend();
    vi.mocked(resolveJournalBackend).mockResolvedValue(backend);

    initJournalHubBridge();
    await reconfigureJournalFromConnection();

    const service = getDefaultLiveJournalService();
    const refreshSpy = vi.spyOn(service, 'refresh').mockResolvedValue();

    expect(sampleImportedListeners).toHaveLength(1);
    sampleImportedListeners[0]?.({ sampleId: 's1' });

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
