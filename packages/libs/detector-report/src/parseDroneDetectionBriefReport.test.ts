import { describe, expect, it } from 'vitest';

import { buildBriefDroneDetectionReport, mapVerdictsToBrief } from './buildBriefDroneDetectionReport.js';
import { parseDroneDetectionBriefReport } from './parseDroneDetectionBriefReport.js';

describe('parseDroneDetectionBriefReport', () => {
  const validReport = buildBriefDroneDetectionReport({
    reportId: 'brief-parse-1',
    sample: {
      id: 'sample-1',
      title: 'hover',
      sampleRate: 48_000,
      durationSec: 3,
    },
    verdicts: mapVerdictsToBrief([
      { detectorName: 'harmonic', isDrone: true, confidence: 0.8 },
      { detectorName: 'cepstral', isDrone: false, confidence: 0.2 },
    ]),
    analysisMode: 'stream-auto',
    detailedReportStatus: 'pending',
    detailedReportId: 'ddr-pending-1',
  });

  it('round-trips a built brief report', () => {
    expect(parseDroneDetectionBriefReport(validReport)).toEqual(validReport);
  });

  it('rejects non-object root', () => {
    expect(parseDroneDetectionBriefReport(null)).toBeNull();
    expect(parseDroneDetectionBriefReport('brief')).toBeNull();
  });

  it('rejects invalid meta.schemaVersion', () => {
    const broken = {
      ...validReport,
      meta: { ...validReport.meta, schemaVersion: 'drone-detection-brief/v0' },
    };
    expect(parseDroneDetectionBriefReport(broken)).toBeNull();
  });

  it('rejects verdict with wrong detectorFamily', () => {
    const broken = {
      ...validReport,
      verdicts: [{ ...validReport.verdicts[0], detectorFamily: 'ml' }],
    };
    expect(parseDroneDetectionBriefReport(broken)).toBeNull();
  });

  it('rejects invalid analysisMode', () => {
    const broken = {
      ...validReport,
      meta: { ...validReport.meta, analysisMode: 'batch-offline' },
    };
    expect(parseDroneDetectionBriefReport(broken)).toBeNull();
  });
});
