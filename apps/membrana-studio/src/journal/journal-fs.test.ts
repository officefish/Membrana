import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { JournalFsStore } from './journal-fs';
import { liveJournalTrackClientEntryId } from './journal-memory';
import { TELEMETRY_TRACK_SCHEMA_VERSION } from './types';

function sampleTrackInput(trackId: string) {
  return {
    clientEntryId: liveJournalTrackClientEntryId(trackId),
    moduleId: 'mic-mod',
    moduleName: 'microphone',
    track: {
      schema: TELEMETRY_TRACK_SCHEMA_VERSION,
      trackId,
      sampleId: `sample-${trackId}`,
      title: 'mic-auto-5s',
      durationSec: 5,
      sampleRate: 48_000,
      captureMode: 'auto' as const,
      createdAtIso: '2026-06-15T12:00:00.000Z',
    },
  };
}

describe('JournalFsStore', () => {
  let tmpDir: string;
  let store: JournalFsStore;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'membrana-journal-'));
    store = new JournalFsStore(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('persists appended tracks to items.json', async () => {
    const item = await store.appendTrack(sampleTrackInput('track-1'));
    expect(item).not.toBeNull();
    expect(item?.clientEntryId).toBe(liveJournalTrackClientEntryId('track-1'));

    const store2 = new JournalFsStore(tmpDir);
    const items = await store2.listItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.clientEntryId).toBe(item?.clientEntryId);

    const raw = await readFile(path.join(tmpDir, 'items.json'), 'utf8');
    expect(raw).toContain('track-1');
  });

  it('deduplicates by clientEntryId after reload', async () => {
    await store.appendTrack(sampleTrackInput('track-1'));
    const dup = await store.appendTrack(sampleTrackInput('track-1'));
    expect(dup).toBeNull();

    const store2 = new JournalFsStore(tmpDir);
    expect(await store2.listItems()).toHaveLength(1);
  });
});
