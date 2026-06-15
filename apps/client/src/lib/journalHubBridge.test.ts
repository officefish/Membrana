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

describe('journalHubBridge', () => {
  afterEach(() => {
    resetJournalHubBridgeForTests();
    resetDefaultLiveJournalServiceForTests();
    vi.mocked(resolveJournalBackend).mockReset();
  });

  it('configures default live journal service from resolved backend', async () => {
    const backend = createMemoryJournalStorageBackend();
    vi.mocked(resolveJournalBackend).mockResolvedValue(backend);

    initJournalHubBridge();
    await reconfigureJournalFromConnection();

    expect(getDefaultLiveJournalService().getSnapshot().storageMode).toBe('browser-limited-fallback');
  });
});
