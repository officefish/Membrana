import { describe, expect, it } from 'vitest';

import {
  TELEMETRY_TRACK_SCHEMA_VERSION,
  countLiveJournalFilters,
  createLiveJournalService,
  createMemoryJournalStorageBackend,
  getLiveJournalSoundClass,
  liveJournalReportClientEntryId,
  liveJournalTrackClientEntryId,
  matchesLiveJournalFilter,
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

describe('live journal filters', () => {
  it('matches tracks, reports and detections', () => {
    const track = {
      id: '1',
      kind: 'track' as const,
      timestamp: 1,
      clientEntryId: 't1',
      moduleId: 'm',
      moduleName: 'microphone',
      tags: [],
      track: sampleTrackInput('a').track,
    };
    const reportDetected = {
      id: '2',
      kind: 'report' as const,
      timestamp: 2,
      clientEntryId: 'r1',
      moduleId: 'm',
      moduleName: 'microphone',
      tags: [],
      report: {
        schema: 'drone-detection-report/v1',
        reportId: 'rep-1',
        trackId: 'a',
        isDetected: true,
        payload: {},
      },
    };
    const reportClear = {
      ...reportDetected,
      id: '3',
      clientEntryId: 'r2',
      report: { ...reportDetected.report, reportId: 'rep-2', isDetected: false },
    };
    const reportSpeech = {
      ...reportClear,
      id: '4',
      clientEntryId: 'r3',
      report: {
        ...reportClear.report,
        reportId: 'rep-3',
        payload: { report: { class: 'speech' } },
      },
    };

    expect(matchesLiveJournalFilter(track, 'tracks')).toBe(true);
    expect(matchesLiveJournalFilter(reportDetected, 'reports')).toBe(true);
    expect(matchesLiveJournalFilter(reportDetected, 'detections')).toBe(true);
    expect(matchesLiveJournalFilter(reportClear, 'detections')).toBe(false);
    expect(getLiveJournalSoundClass(reportSpeech)).toBe('speech');

    const counts = countLiveJournalFilters([track, reportDetected, reportClear]);
    expect(counts).toEqual({ all: 3, tracks: 1, reports: 2, detections: 1 });
  });
});

describe('LiveJournalService', () => {
  it('appends track and report with dedupe', async () => {
    const service = createLiveJournalService(createMemoryJournalStorageBackend());
    await service.init();

    const track = await service.appendTrack(sampleTrackInput('track-1'));
    expect(track?.kind).toBe('track');

    const dup = await service.appendTrack(sampleTrackInput('track-1'));
    expect(dup).toBeNull();

    const report = await service.appendReport({
      clientEntryId: liveJournalReportClientEntryId('rep-1'),
      moduleId: 'mic-mod',
      moduleName: 'microphone',
      report: {
        schema: 'drone-detection-report/v1',
        reportId: 'rep-1',
        trackId: 'track-1',
        isDetected: true,
        summaryText: 'дрон',
        payload: { meta: { reportId: 'rep-1' } },
      },
    });

    expect(report?.kind).toBe('report');
    expect(service.getSnapshot().items).toHaveLength(2);
    expect(service.listFiltered('detections')).toHaveLength(1);
  });

  it('clearByFilter removes the active subset without cascade (JE5)', async () => {
    const service = createLiveJournalService(createMemoryJournalStorageBackend());
    await service.init();

    await service.appendTrack(sampleTrackInput('track-1'));
    await service.appendTrack(sampleTrackInput('track-2'));
    await service.appendReport({
      clientEntryId: liveJournalReportClientEntryId('rep-1'),
      moduleId: 'mic-mod',
      moduleName: 'microphone',
      report: {
        schema: 'drone-detection-report/v1',
        reportId: 'rep-1',
        trackId: 'track-1',
        isDetected: true,
        summaryText: 'дрон',
        payload: { meta: { reportId: 'rep-1' } },
      },
    });
    await service.appendReport({
      clientEntryId: liveJournalReportClientEntryId('rep-2'),
      moduleId: 'mic-mod',
      moduleName: 'microphone',
      report: {
        schema: 'drone-detection-report/v1',
        reportId: 'rep-2',
        trackId: 'track-2',
        isDetected: false,
        summaryText: 'чисто',
        payload: { meta: { reportId: 'rep-2' } },
      },
    });

    const tracksOnly = await service.clearByFilter('tracks');
    expect(tracksOnly.deleted).toBe(2);
    expect(service.getSnapshot().items).toHaveLength(2);
    expect(service.listFiltered('reports')).toHaveLength(2);

    const detectionsOnly = await service.clearByFilter('detections');
    expect(detectionsOnly.deleted).toBe(1);
    expect(service.getSnapshot().items).toHaveLength(1);
    expect(service.getSnapshot().items[0]?.report?.isDetected).toBe(false);

    const reportsOnly = await service.clearByFilter('reports');
    expect(reportsOnly.deleted).toBe(1);
    expect(service.getSnapshot().items).toHaveLength(0);
  });
});
