import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildDroneDetectionReport,
  DRONE_DETECTION_REPORT_SCHEMA_VERSION,
  droneDetectionTelemetryReportUniqueId,
} from '@membrana/detector-report';

import { isDroneDetectionConsensus, logDroneDetectionReport } from './droneAnalysisTelemetry';

const addReportEntry = vi.fn(() => 'entry-1');

vi.mock('@membrana/telemetry-service', () => ({
  getDefaultTelemetryJournal: () => ({
    addReportEntry,
  }),
}));

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
      {
        detectorName: 'template-match',
        detectorFamily: 'dsp',
        isDrone: false,
        confidence: 0.2,
        breakdown: {
          kind: 'template-match',
          minConfidence: 0.5,
          winner: {
            templateKey: 'DRONE_CURATED',
            templateName: 'Curated',
            overallScore: 0.2,
            spectralScore: 0.2,
            temporalScore: 0.2,
          },
          metricSamples: [],
          fields: [],
          topTemplates: [],
        },
      },
    ],
  });
}

describe('droneAnalysisTelemetry', () => {
  beforeEach(() => {
    addReportEntry.mockClear();
  });

  it('detects consensus when any detector reports drone', () => {
    expect(isDroneDetectionConsensus(sampleReport(true))).toBe(true);
    expect(isDroneDetectionConsensus(sampleReport(false))).toBe(false);
  });

  it('writes drone-detection-report/v1 payload with dedupe key', () => {
    const report = sampleReport(true);
    logDroneDetectionReport('mod-drone', report);

    expect(addReportEntry).toHaveBeenCalledTimes(1);
    const call = addReportEntry.mock.calls[0]![0] as {
      moduleName: string;
      data: {
        reportUniqueId: string;
        schema: string;
        isDetected: boolean;
        meta: { reportId: string };
        verdicts: unknown[];
      };
      tags: string[];
    };

    expect(call.moduleName).toBe('sample-library-drone-analysis');
    expect(call.data.reportUniqueId).toBe(
      droneDetectionTelemetryReportUniqueId(report.meta.reportId),
    );
    expect(call.data.schema).toBe(DRONE_DETECTION_REPORT_SCHEMA_VERSION);
    expect(call.data.isDetected).toBe(true);
    expect(call.data.meta.reportId).toBe(report.meta.reportId);
    expect(call.data.verdicts).toHaveLength(2);
    expect(call.tags).toContain('analysis');
    expect(call.tags).toContain('drone');
    expect(call.tags).toContain('sample-library');
    expect(call.tags).toContain('detection');
    expect(call.tags).toContain('detected');
  });

  it('writes clear tags when no detector reports drone', () => {
    logDroneDetectionReport('mod-drone', sampleReport(false));
    const call = addReportEntry.mock.calls[0]![0] as { tags: string[]; data: { isDetected: boolean } };
    expect(call.data.isDetected).toBe(false);
    expect(call.tags).toContain('clear');
    expect(call.tags).toContain('not-detected');
    expect(call.tags).not.toContain('detection');
  });
});
