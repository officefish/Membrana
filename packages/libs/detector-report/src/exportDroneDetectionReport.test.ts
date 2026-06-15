import { describe, expect, it } from 'vitest';

import { buildDroneDetectionReport } from './buildDroneDetectionReport.js';
import { formatReportTimestampMoscow } from './formatReportTimestampMoscow.js';
import {
  exportDroneDetectionReportJson,
  exportDroneDetectionReportTxt,
  reportExportBasename,
} from './exportDroneDetectionReport.js';
import { droneDetectionTelemetryReportUniqueId } from './telemetryReportUniqueId.js';
import { DRONE_DETECTION_REPORT_SCHEMA_VERSION } from './types.js';
import { SAMPLE_DDR1_FIXTURE_INPUT } from './test-fixtures.js';

describe('formatReportTimestampMoscow', () => {
  it('formats fixed UTC instant in Moscow time with МСК suffix', () => {
    const formatted = formatReportTimestampMoscow(new Date('2026-06-15T13:42:03.000Z'));
    expect(formatted).toMatch(/15\.06\.2026/);
    expect(formatted).toMatch(/16:42:03/);
    expect(formatted).toMatch(/МСК$/);
  });
});

describe('buildDroneDetectionReport', () => {
  it('assigns meta from input sample and fixed timestamps', () => {
    const report = buildDroneDetectionReport(SAMPLE_DDR1_FIXTURE_INPUT);

    expect(report.meta.reportId).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(report.meta.schemaVersion).toBe(DRONE_DETECTION_REPORT_SCHEMA_VERSION);
    expect(report.meta.createdAtIso).toBe('2026-06-15T13:42:03.000Z');
    expect(report.meta.createdAtMoscow).toContain('МСК');
    expect(report.meta.sampleId).toBe('sample-fixture-001');
    expect(report.meta.groundTruthLabel).toBe('drone');
    expect(report.verdicts).toHaveLength(2);
  });

  it('generates reportId when omitted', () => {
    const { reportId: _ignored, ...rest } = SAMPLE_DDR1_FIXTURE_INPUT;
    const report = buildDroneDetectionReport(rest);
    expect(report.meta.reportId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe('telemetryReportUniqueId', () => {
  it('prefixes report id for journal dedupe', () => {
    expect(droneDetectionTelemetryReportUniqueId('abc-123')).toBe('drone-report-abc-123');
  });
});

describe('exportDroneDetectionReport', () => {
  const report = buildDroneDetectionReport(SAMPLE_DDR1_FIXTURE_INPUT);

  it('exports stable JSON snapshot', () => {
    const json = exportDroneDetectionReportJson(report);
    expect(json).toContain('"reportId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"');
    expect(json).toContain('"schemaVersion": "drone-detection-report/v1"');
    expect(json).toContain('"createdAtMoscow"');
    expect(JSON.parse(json)).toEqual(report);
  });

  it('exports readable plain text with Moscow time and detector tables', () => {
    const text = exportDroneDetectionReportTxt(report);
    expect(text).toContain('ID отчёта: aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee');
    expect(text).toContain('Создан (МСК):');
    expect(text).toContain('Drone hover 5s');
    expect(text).toContain('Гармонический (harmonic)');
    expect(text).toContain('Сопоставление шаблонов (template-match)');
    expect(text).toContain('DRONE_CURATED');
    expect(text).toContain('harmonic score');
  });

  it('builds export basename from report id', () => {
    expect(reportExportBasename(report)).toBe(
      'drone-detection-report_aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
  });
});
