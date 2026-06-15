import { describe, expect, it } from 'vitest';

import { buildDroneDetectionReport } from '@membrana/detector-report';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { droneDetectionReportFromItem } from './droneDetectionReportFromItem';

describe('droneDetectionReportFromItem', () => {
  it('extracts nested DroneDetectionReport DTO', () => {
    const report = buildDroneDetectionReport({
      reportId: 'rep-1',
      sample: {
        id: 'sample-1',
        title: 'clip',
        sampleRate: 48_000,
        durationSec: 5,
      },
      verdicts: [],
    });

    const item: LiveJournalItem = {
      id: '1',
      kind: 'report',
      timestamp: Date.now(),
      clientEntryId: 'live-report-rep-1',
      moduleId: 'mic',
      moduleName: 'microphone',
      tags: [],
      report: {
        schema: 'drone-detection-report/v1',
        reportId: 'rep-1',
        trackId: 'track-1',
        isDetected: false,
        payload: { report },
      },
    };

    const parsed = droneDetectionReportFromItem(item);
    expect(parsed?.meta.reportId).toBe('rep-1');
    expect(parsed?.meta.sampleId).toBe('sample-1');
  });
});
