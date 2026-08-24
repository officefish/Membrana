import { describe, expect, it, vi } from 'vitest';

import { paginateLiveJournalItemRows } from './live-journal-pagination';
import { JOURNAL_INTERNAL_FETCH_CAP, JournalService, parseJournalListLimit } from './journal.service';

function telemetryTrackRow(index: number) {
  const startedAt = new Date(Date.parse('2026-08-23T18:00:00.000Z') - index * 5_000);
  const trackId = `track-${index}`;
  return {
    id: `live-${index}`,
    recordKind: 'telemetry-track/v1',
    moduleId: 'microphone',
    clientRecordId: `live-track-${trackId}`,
    status: 'ended' as const,
    startedAt,
    endedAt: startedAt,
    payload: {
      item: {
        schema: 'telemetry-track/v1',
        trackId,
        sampleId: `sample-${index}`,
        title: 'mic-auto-5s',
        durationSec: 5,
        sampleRate: 48_000,
        captureMode: 'auto',
        createdAtIso: startedAt.toISOString(),
      },
      moduleName: 'microphone',
    },
    nodeId: 'node-1',
    mediaDeviceId: 'device-1',
    createdAt: startedAt,
    updatedAt: startedAt,
  };
}

function createJournalServiceHarness(options: {
  liveRows?: ReturnType<typeof telemetryTrackRow>[];
  reportRows?: unknown[];
  counts?: { tracks: number; reports: number; detections: number };
} = {}) {
  const prisma = {
    membrane: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'membrane-1',
        nodes: [{ id: 'node-1', device: { mediaDeviceId: 'device-1' } }],
      }),
    },
    telemetryReport: {
      findMany: vi.fn().mockResolvedValue(options.reportRows ?? []),
      count: vi
        .fn()
        .mockResolvedValueOnce(options.counts?.reports ?? 0)
        .mockResolvedValueOnce(options.counts?.detections ?? 0),
    },
    telemetryLiveRecord: {
      findMany: vi.fn().mockResolvedValue(options.liveRows ?? []),
      count: vi.fn().mockResolvedValue(options.counts?.tracks ?? 0),
    },
  };
  return { service: new JournalService(prisma as never), prisma };
}

describe('parseJournalListLimit', () => {
  it('defaults invalid limit to 50', () => {
    expect(parseJournalListLimit(undefined)).toBe(50);
    expect(parseJournalListLimit('abc')).toBe(50);
    expect(parseJournalListLimit('0')).toBe(50);
  });

  it('caps limit at 50 (TJ9 page size)', () => {
    expect(parseJournalListLimit('500')).toBe(50);
    expect(parseJournalListLimit('25')).toBe(25);
  });
});

describe('paginateLiveJournalItemRows', () => {
  it('returns nextCursor when more rows exist', () => {
    const rows = Array.from({ length: 60 }, (_, index) => ({
      id: `id-${index}`,
      kind: 'track' as const,
      timestamp: 1_000 - index,
      clientEntryId: `ce-${index}`,
      moduleId: 'microphone',
      moduleName: 'microphone',
      tags: ['live', 'track'],
      track: {},
    }));

    const page = paginateLiveJournalItemRows(rows, { limit: 50 });
    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).not.toBeNull();
  });
});

describe('JournalService.listJournalItems', () => {
  it('reads the page from bounded DB queries instead of loading the whole journal (#2113)', async () => {
    const { service, prisma } = createJournalServiceHarness({
      liveRows: Array.from({ length: 51 }, (_, index) => telemetryTrackRow(index)),
      counts: { tracks: 2_501, reports: 0, detections: 0 },
    });

    const page = await service.listJournalItems('user-1', '50', 'device-1');

    expect(page.items).toHaveLength(50);
    expect(page.nextCursor).not.toBeNull();
    expect(page.counts).toEqual({ all: 2_501, tracks: 2_501, reports: 0, detections: 0 });
    expect(prisma.telemetryLiveRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 51 }),
    );
    expect(prisma.telemetryReport.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 51 }),
    );
    expect(prisma.telemetryLiveRecord.findMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ take: JOURNAL_INTERNAL_FETCH_CAP }),
    );
  });

  it('pushes cursor and since filters into the DB query (#2113)', async () => {
    const cursor = `${Date.parse('2026-08-23T18:00:00.000Z')}:live-track-track-10`;
    const { service, prisma } = createJournalServiceHarness({
      liveRows: [telemetryTrackRow(11)],
      counts: { tracks: 2_501, reports: 0, detections: 0 },
    });

    await service.listJournalItems(
      'user-1',
      '25',
      'device-1',
      cursor,
      'tracks',
      String(Date.parse('2026-08-23T17:00:00.000Z')),
    );

    expect(prisma.telemetryReport.findMany).not.toHaveBeenCalled();
    expect(prisma.telemetryLiveRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 26,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            { startedAt: { gt: new Date('2026-08-23T17:00:00.000Z') } },
            expect.objectContaining({ OR: expect.any(Array) }),
          ]),
        }),
      }),
    );
  });
});
