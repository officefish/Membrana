import { describe, expect, it, vi } from 'vitest';

import {
  TELEMETRY_TRACK_SCHEMA_VERSION,
  createSyncJournalStorageBackend,
  liveJournalTrackClientEntryId,
  type ICabinetJournalPort,
} from '../src/index.js';

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

describe('SyncJournalStorageBackend', () => {
  it('pulls remote rows and pushes local appends', async () => {
    const createLiveRecord = vi.fn().mockResolvedValue({ deduplicated: false });
    const port: ICabinetJournalPort = {
      listReports: vi.fn().mockResolvedValue([
        {
          id: 'rep-server',
          reportKind: 'drone-detection-report/v1',
          clientEntryId: 'live-report-rep-1',
          moduleId: 'mic-mod',
          moduleName: 'microphone',
          finishedAt: '2026-06-15T12:00:05.000Z',
          payload: {
            schema: 'drone-detection-report/v1',
            reportId: 'rep-1',
            trackId: 'remote-track',
            isDetected: true,
            payload: {},
          },
          tags: ['live', 'report', 'detection'],
        },
      ]),
      listLiveRecords: vi.fn().mockResolvedValue([]),
      createReport: vi.fn(),
      createLiveRecord,
    };

    const backend = createSyncJournalStorageBackend(port);
    const items = await backend.listItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe('report');

    await backend.appendTrack(sampleTrackInput('local-track'));
    expect(createLiveRecord).toHaveBeenCalledTimes(1);
    expect(createLiveRecord.mock.calls[0]?.[0]?.recordKind).toBe(TELEMETRY_TRACK_SCHEMA_VERSION);

    const merged = await backend.listItems();
    expect(merged.some((item) => item.kind === 'track')).toBe(true);
    expect(merged.some((item) => item.kind === 'report')).toBe(true);
  });
});
