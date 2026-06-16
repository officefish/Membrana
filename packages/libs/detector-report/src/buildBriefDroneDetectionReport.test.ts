import { describe, expect, it } from 'vitest';

import {
  buildBriefDroneDetectionReport,
  buildBriefDroneDetectionSummaryText,
  isDroneBriefConsensus,
  mapVerdictsToBrief,
} from './buildBriefDroneDetectionReport.js';

describe('buildBriefDroneDetectionReport', () => {
  it('builds brief schema without frame breakdown', () => {
    const report = buildBriefDroneDetectionReport({
      reportId: 'brief-1',
      sample: {
        id: 'sample-1',
        title: 'test',
        sampleRate: 48_000,
        durationSec: 3,
      },
      verdicts: mapVerdictsToBrief([
        { detectorName: 'harmonic', isDrone: true, confidence: 0.8 },
        { detectorName: 'cepstral', isDrone: false, confidence: 0.2 },
      ]),
      analysisMode: 'stream-auto',
    });

    expect(report.meta.schemaVersion).toBe('drone-detection-brief/v1');
    expect(report.verdicts).toHaveLength(2);
    expect(isDroneBriefConsensus(report)).toBe(true);
    expect(buildBriefDroneDetectionSummaryText(report, true)).toContain('дрон');
  });
});
