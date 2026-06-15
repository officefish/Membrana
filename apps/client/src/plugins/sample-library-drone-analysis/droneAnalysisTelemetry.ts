import {
  DRONE_DETECTION_REPORT_SCHEMA_VERSION,
  droneDetectionTelemetryReportUniqueId,
  type DroneDetectionReport,
} from '@membrana/detector-report';
import { getDefaultTelemetryJournal } from '@membrana/telemetry-service';

import { SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID } from './types';

const MODULE_NAME = SAMPLE_LIBRARY_DRONE_ANALYSIS_PLUGIN_ID;

function journal() {
  return getDefaultTelemetryJournal();
}

/** Any detector marked the sample as drone. */
export function isDroneDetectionConsensus(report: DroneDetectionReport): boolean {
  return report.verdicts.some((section) => section.isDrone);
}

function buildSummaryText(report: DroneDetectionReport, isDetected: boolean): string {
  const label = report.meta.sampleTitle ?? report.meta.sampleId;
  const droneCount = report.verdicts.filter((section) => section.isDrone).length;
  const verdict = isDetected ? 'дрон' : 'не дрон';
  return `${verdict}: ${label} · ${droneCount}/${report.verdicts.length} детектор(ов)`;
}

/** Persist detailed drone detection report in telemetry journal (DDR4). */
export function logDroneDetectionReport(
  moduleId: string,
  report: DroneDetectionReport,
): string | null {
  const isDetected = isDroneDetectionConsensus(report);

  return journal().addReportEntry({
    type: 'analysis',
    moduleId,
    moduleName: MODULE_NAME,
    data: {
      reportUniqueId: droneDetectionTelemetryReportUniqueId(report.meta.reportId),
      schema: DRONE_DETECTION_REPORT_SCHEMA_VERSION,
      isDetected,
      summaryText: buildSummaryText(report, isDetected),
      meta: report.meta,
      verdicts: report.verdicts,
    },
    tags: [
      'analysis',
      'drone',
      'sample-library',
      isDetected ? 'detection' : 'clear',
      isDetected ? 'detected' : 'not-detected',
    ],
  });
}
