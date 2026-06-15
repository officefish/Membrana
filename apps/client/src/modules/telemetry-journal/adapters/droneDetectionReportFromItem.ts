import type { DroneDetectionReport } from '@membrana/detector-report';
import { DRONE_DETECTION_REPORT_SCHEMA_VERSION } from '@membrana/detector-report';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parse DroneDetectionReport from live journal report payload (TJ5). */
export function droneDetectionReportFromItem(item: LiveJournalItem): DroneDetectionReport | null {
  if (item.kind !== 'report' || !item.report) return null;
  if (item.report.schema !== DRONE_DETECTION_REPORT_SCHEMA_VERSION) return null;

  const nested = item.report.payload['report'];
  if (!isRecord(nested)) return null;
  if (!isRecord(nested.meta)) return null;
  if (!Array.isArray(nested.verdicts)) return null;

  return nested as DroneDetectionReport;
}
