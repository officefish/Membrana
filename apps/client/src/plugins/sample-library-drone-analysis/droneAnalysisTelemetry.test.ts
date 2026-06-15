import { describe, expect, it } from 'vitest';

import { buildDroneDetectionReport } from '@membrana/detector-report';

import {
  buildDroneDetectionSummaryText,
  isDroneDetectionConsensus,
  logDroneDetectionReport,
} from './droneAnalysisTelemetry';

function sampleReport(isDrone: boolean) {
  return buildDroneDetectionReport({
    reportId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    sample: {
      id: 'sample-1',
      title: 'Test clip',
      sampleRate: 48_000,
      durationSec: 5,
    },
    verdicts: [
      {
        detectorName: 'harmonic',
        detectorFamily: 'dsp',
        isDrone,
        confidence: isDrone ? 0.9 : 0.1,
        breakdown: {
          kind: 'harmonic',
          aggregation: 'any-frame',
          frames: [],
        },
      },
    ],
  });
}

describe('droneAnalysisTelemetry', () => {
  it('detects consensus when any detector reports drone', () => {
    expect(isDroneDetectionConsensus(sampleReport(true))).toBe(true);
    expect(isDroneDetectionConsensus(sampleReport(false))).toBe(false);
  });

  it('builds summary text for detected and clear verdicts', () => {
    expect(buildDroneDetectionSummaryText(sampleReport(true), true)).toContain('дрон');
    expect(buildDroneDetectionSummaryText(sampleReport(false), false)).toContain('не дрон');
  });

  it('does not write offline reports to legacy journal (TJ3)', () => {
    expect(logDroneDetectionReport('mod-drone', sampleReport(true))).toBeNull();
  });
});
