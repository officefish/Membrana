import { describe, expect, it, vi } from 'vitest';

import {
  TELEMETRY_TRACK_SCHEMA_VERSION,
  createLiveJournalService,
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
  it('does not full-rescan when incremental counts are behind local cache (#2113)', async () => {
    const remoteTrack = {
      id: 'track-server',
      kind: 'track' as const,
      timestamp: Date.parse('2026-06-15T12:00:00.000Z'),
      clientEntryId: liveJournalTrackClientEntryId('remote-track'),
      moduleId: 'mic-mod',
      moduleName: 'microphone',
      tags: ['live', 'track'],
      track: {
        schema: TELEMETRY_TRACK_SCHEMA_VERSION,
        trackId: 'remote-track',
        sampleId: 'sample-remote',
        title: 'mic-auto-5s',
        durationSec: 5,
        sampleRate: 48_000,
        captureMode: 'auto' as const,
        createdAtIso: '2026-06-15T12:00:00.000Z',
      },
    };
    const listJournalItems = vi
      .fn()
      .mockResolvedValueOnce({
        items: [remoteTrack],
        nextCursor: null,
        counts: { all: 1, tracks: 1, reports: 0, detections: 0 },
      })
      .mockResolvedValueOnce({
        items: [],
        nextCursor: null,
        counts: { all: 0, tracks: 0, reports: 0, detections: 0 },
      });
    const port: ICabinetJournalPort = {
      listReports: vi.fn().mockResolvedValue([]),
      listLiveRecords: vi.fn().mockResolvedValue([]),
      listJournalItems,
      createReport: vi.fn(),
      createLiveRecord: vi.fn(),
    };

    const backend = createSyncJournalStorageBackend(port);
    expect(await backend.listItems()).toHaveLength(1);
    expect(await backend.listItems()).toHaveLength(1);
    expect(listJournalItems).toHaveBeenCalledTimes(2);
    expect(listJournalItems).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ since: remoteTrack.timestamp }),
    );
  });

  it('drops server-deleted rows only on explicit full reconcile (#2131)', async () => {
    const keptTrack = {
      id: 'track-kept',
      kind: 'track' as const,
      timestamp: Date.parse('2026-06-15T12:00:05.000Z'),
      clientEntryId: liveJournalTrackClientEntryId('kept-track'),
      moduleId: 'mic-mod',
      moduleName: 'microphone',
      tags: ['live', 'track'],
      track: sampleTrackInput('kept-track').track,
    };
    const deletedTrack = {
      ...keptTrack,
      id: 'track-deleted',
      timestamp: Date.parse('2026-06-15T12:00:00.000Z'),
      clientEntryId: liveJournalTrackClientEntryId('deleted-track'),
      track: sampleTrackInput('deleted-track').track,
    };
    const listJournalItems = vi
      .fn()
      .mockResolvedValueOnce({
        items: [keptTrack, deletedTrack],
        nextCursor: null,
        counts: { all: 2, tracks: 2, reports: 0, detections: 0 },
      })
      .mockResolvedValueOnce({
        items: [keptTrack],
        nextCursor: null,
        counts: { all: 1, tracks: 1, reports: 0, detections: 0 },
      });
    const port: ICabinetJournalPort = {
      listReports: vi.fn().mockResolvedValue([]),
      listLiveRecords: vi.fn().mockResolvedValue([]),
      listJournalItems,
      createReport: vi.fn(),
      createLiveRecord: vi.fn(),
    };

    const service = createLiveJournalService(createSyncJournalStorageBackend(port));
    await service.init();
    expect(service.getSnapshot().items.map((item) => item.clientEntryId)).toContain(
      deletedTrack.clientEntryId,
    );

    await service.refresh({ mode: 'full-reconcile' });

    expect(service.getSnapshot().items.map((item) => item.clientEntryId)).toEqual([
      keptTrack.clientEntryId,
    ]);
    expect(listJournalItems).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({ since: expect.any(Number) }),
    );
  });

  it('pulls only rows changed since the last remote journal timestamp (#2113)', async () => {
    const firstTrack = {
      id: 'track-server-1',
      kind: 'track' as const,
      timestamp: Date.parse('2026-06-15T12:00:00.000Z'),
      clientEntryId: liveJournalTrackClientEntryId('remote-track-1'),
      moduleId: 'mic-mod',
      moduleName: 'microphone',
      tags: ['live', 'track'],
      track: sampleTrackInput('remote-track-1').track,
    };
    const nextTrack = {
      ...firstTrack,
      id: 'track-server-2',
      timestamp: Date.parse('2026-06-15T12:00:05.000Z'),
      clientEntryId: liveJournalTrackClientEntryId('remote-track-2'),
      track: sampleTrackInput('remote-track-2').track,
    };
    const listJournalItems = vi
      .fn()
      .mockResolvedValueOnce({
        items: [firstTrack],
        nextCursor: null,
        counts: { all: 1, tracks: 1, reports: 0, detections: 0 },
      })
      .mockResolvedValueOnce({
        items: [nextTrack],
        nextCursor: null,
        counts: { all: 2, tracks: 2, reports: 0, detections: 0 },
      });
    const port: ICabinetJournalPort = {
      listReports: vi.fn().mockResolvedValue([]),
      listLiveRecords: vi.fn().mockResolvedValue([]),
      listJournalItems,
      createReport: vi.fn(),
      createLiveRecord: vi.fn(),
    };

    const backend = createSyncJournalStorageBackend(port);
    expect(await backend.listItems()).toHaveLength(1);
    expect(await backend.listItems()).toHaveLength(2);

    expect(listJournalItems).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ since: firstTrack.timestamp }),
    );
  });

  it('backs off remote pulls after a failed refresh (#2113)', async () => {
    const listJournalItems = vi.fn().mockRejectedValue(new Error('cabinet congested'));
    const port: ICabinetJournalPort = {
      listReports: vi.fn().mockResolvedValue([]),
      listLiveRecords: vi.fn().mockResolvedValue([]),
      listJournalItems,
      createReport: vi.fn(),
      createLiveRecord: vi.fn(),
    };

    const backend = createSyncJournalStorageBackend(port, { remotePullBackoffMs: 60_000 });
    await backend.listItems();
    await backend.listItems();

    expect(listJournalItems).toHaveBeenCalledTimes(1);
  });

  it('pulls remote rows and pushes local appends', async () => {
    const createLiveRecord = vi.fn().mockResolvedValue({ deduplicated: false });
    const listJournalItems = vi.fn().mockResolvedValue({
      items: [
        {
          id: 'rep-server',
          kind: 'report' as const,
          timestamp: Date.parse('2026-06-15T12:00:05.000Z'),
          clientEntryId: 'live-report-rep-1',
          moduleId: 'mic-mod',
          moduleName: 'microphone',
          tags: ['live', 'report', 'detection'],
          report: {
            schema: 'drone-detection-report/v1',
            reportId: 'rep-1',
            trackId: 'remote-track',
            isDetected: true,
            payload: {},
          },
        },
      ],
      nextCursor: null,
      counts: { all: 1, tracks: 0, reports: 1, detections: 1 },
    });
    const port: ICabinetJournalPort = {
      listReports: vi.fn().mockResolvedValue([]),
      listLiveRecords: vi.fn().mockResolvedValue([]),
      listJournalItems,
      createReport: vi.fn(),
      createLiveRecord,
    };

    const backend = createSyncJournalStorageBackend(port);
    const items = await backend.listItems();
    expect(items).toHaveLength(1);
    expect(items[0]?.kind).toBe('report');
    expect(listJournalItems).toHaveBeenCalledTimes(1);

    await backend.appendTrack(sampleTrackInput('local-track'));
    expect(createLiveRecord).toHaveBeenCalledTimes(1);
    expect(createLiveRecord.mock.calls[0]?.[0]?.recordKind).toBe(TELEMETRY_TRACK_SCHEMA_VERSION);

    listJournalItems.mockResolvedValueOnce({
      items: [
        {
          id: 'rep-server',
          kind: 'report' as const,
          timestamp: Date.parse('2026-06-15T12:00:05.000Z'),
          clientEntryId: 'live-report-rep-1',
          moduleId: 'mic-mod',
          moduleName: 'microphone',
          tags: ['live', 'report', 'detection'],
          report: {
            schema: 'drone-detection-report/v1',
            reportId: 'rep-1',
            trackId: 'remote-track',
            isDetected: true,
            payload: {},
          },
        },
        {
          id: 'track-local',
          kind: 'track' as const,
          timestamp: Date.parse('2026-06-15T12:00:00.000Z'),
          clientEntryId: liveJournalTrackClientEntryId('local-track'),
          moduleId: 'mic-mod',
          moduleName: 'microphone',
          tags: ['live', 'track'],
          track: sampleTrackInput('local-track').track,
        },
      ],
      nextCursor: null,
      counts: { all: 2, tracks: 1, reports: 1, detections: 1 },
    });

    const merged = await backend.listItems();
    expect(merged.some((item) => item.kind === 'track')).toBe(true);
    expect(merged.some((item) => item.kind === 'report')).toBe(true);
  });

  it('clears local cache and calls remote delete when available (JE5)', async () => {
    const deleteJournalItems = vi.fn().mockResolvedValue({ deleted: 1 });
    const port: ICabinetJournalPort = {
      listReports: vi.fn().mockResolvedValue([]),
      listLiveRecords: vi.fn().mockResolvedValue([]),
      createReport: vi.fn(),
      createLiveRecord: vi.fn(),
      deleteJournalItems,
    };

    const backend = createSyncJournalStorageBackend(port, { mediaDeviceId: 'device-1' });
    await backend.appendTrack(sampleTrackInput('local-track'));
    expect((await backend.listItems()).some((item) => item.kind === 'track')).toBe(true);

    const deleted = await backend.clearByFilter('tracks');
    expect(deleted).toBe(1);
    expect(deleteJournalItems).toHaveBeenCalledWith({
      filter: 'tracks',
      mediaDeviceId: 'device-1',
    });
    expect((await backend.listItems()).some((item) => item.kind === 'track')).toBe(false);
  });
});
