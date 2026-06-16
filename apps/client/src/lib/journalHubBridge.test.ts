import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createMemoryJournalStorageBackend,
  getDefaultLiveJournalService,
  liveJournalTrackClientEntryId,
  resetDefaultLiveJournalServiceForTests,
  TELEMETRY_TRACK_SCHEMA_VERSION,
} from '@membrana/telemetry-journal-service';

import {
  initJournalHubBridge,
  reconfigureJournalFromConnection,
  resetJournalHubBridgeForTests,
} from './journalHubBridge';
import { resetLiveJournalHubForTests, subscribeJournalSnapshotUpdated } from './liveJournalHub';
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
    resetLiveJournalHubForTests();
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

  it('publishes journalSnapshotUpdated when live journal snapshot changes', async () => {
    const backend = createMemoryJournalStorageBackend();
    vi.mocked(resolveJournalBackend).mockResolvedValue(backend);

    initJournalHubBridge();
    await reconfigureJournalFromConnection();

    const service = getDefaultLiveJournalService();
    const hubListener = vi.fn();
    subscribeJournalSnapshotUpdated(hubListener);

    await service.appendTrack({
      clientEntryId: liveJournalTrackClientEntryId('track-je3'),
      moduleId: 'mic-mod',
      moduleName: 'microphone',
      track: {
        schema: TELEMETRY_TRACK_SCHEMA_VERSION,
        trackId: 'track-je3',
        sampleId: 'sample-je3',
        title: 'mic-auto-5s',
        durationSec: 5,
        sampleRate: 48_000,
        captureMode: 'auto',
        createdAtIso: '2026-06-16T08:00:00.000Z',
      },
    });

    expect(hubListener).toHaveBeenCalled();
    expect(hubListener.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ itemCount: 1 }),
    );
  });

  it('notifies service subscribers for live journal list re-render', async () => {
    const backend = createMemoryJournalStorageBackend();
    vi.mocked(resolveJournalBackend).mockResolvedValue(backend);

    initJournalHubBridge();
    await reconfigureJournalFromConnection();

    const service = getDefaultLiveJournalService();
    const listListener = vi.fn();
    service.subscribe(listListener);

    await service.appendTrack({
      clientEntryId: liveJournalTrackClientEntryId('track-list'),
      moduleId: 'mic-mod',
      moduleName: 'microphone',
      track: {
        schema: TELEMETRY_TRACK_SCHEMA_VERSION,
        trackId: 'track-list',
        sampleId: 'sample-list',
        title: 'mic-auto-5s',
        durationSec: 5,
        sampleRate: 48_000,
        captureMode: 'auto',
        createdAtIso: '2026-06-16T08:00:00.000Z',
      },
    });

    expect(listListener).toHaveBeenCalled();
    expect(service.getSnapshot().items).toHaveLength(1);
  });
});
