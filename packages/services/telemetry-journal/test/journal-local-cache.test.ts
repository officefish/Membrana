import { describe, expect, it, beforeEach, vi } from 'vitest';

import {
  TELEMETRY_TRACK_SCHEMA_VERSION,
  createMemoryJournalStorageBackend,
  journalLocalCacheKey,
  readJournalLocalCache,
  writeJournalLocalCache,
} from '../src/index.js';
import type { LiveJournalItem } from '../src/types.js';

const storage = new Map<string, string>();

function sampleTrackItem(trackId: string): LiveJournalItem {
  return {
    id: 'item-1',
    kind: 'track',
    timestamp: Date.now(),
    clientEntryId: `live-track-${trackId}`,
    moduleId: 'mic',
    moduleName: 'microphone',
    tags: ['live', 'track'],
    track: {
      schema: TELEMETRY_TRACK_SCHEMA_VERSION,
      trackId,
      sampleId: `sample-${trackId}`,
      title: 'mic-auto-5s',
      durationSec: 5,
      sampleRate: 48_000,
      captureMode: 'auto',
      createdAtIso: new Date().toISOString(),
    },
  };
}

describe('journal local cache (TJ6)', () => {
  beforeEach(() => {
    storage.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    });
  });

  it('round-trips snapshot through localStorage key', () => {
    const key = journalLocalCacheKey('device-a');
    const item = sampleTrackItem('t1');
    writeJournalLocalCache(key, [item]);
    const restored = readJournalLocalCache(key);
    expect(restored).toHaveLength(1);
    expect(restored?.[0]?.track?.trackId).toBe('t1');
  });

  it('rehydrates sync backend local cache on construct', async () => {
    const key = journalLocalCacheKey('device-b');
    writeJournalLocalCache(key, [sampleTrackItem('cached')]);

    const local = createMemoryJournalStorageBackend();
    const { createSyncJournalStorageBackend } = await import('../src/backends/sync-journal-storage-backend.js');
    const backend = createSyncJournalStorageBackend(
      {
        listReports: vi.fn().mockResolvedValue([]),
        listLiveRecords: vi.fn().mockResolvedValue([]),
        createReport: vi.fn(),
        createLiveRecord: vi.fn(),
      },
      { localCacheKey: key },
      local,
    );

    const items = await backend.listItems();
    expect(items.some((row) => row.track?.trackId === 'cached')).toBe(true);
  });
});
