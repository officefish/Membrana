import type { DroneDetectionBriefReport } from '@membrana/detector-report';
import { DRONE_DETECTION_BRIEF_SCHEMA_VERSION } from '@membrana/detector-report';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parse DroneDetectionBriefReport from live journal report payload. */
export function droneDetectionBriefFromItem(
  item: LiveJournalItem,
): DroneDetectionBriefReport | null {
  if (item.kind !== 'report' || !item.report) return null;
  if (item.report.schema !== DRONE_DETECTION_BRIEF_SCHEMA_VERSION) return null;

  const nested = item.report.payload['report'];
  if (!isRecord(nested)) return null;
  if (!isRecord(nested.meta)) return null;
  if (!Array.isArray(nested.verdicts)) return null;

  return nested as DroneDetectionBriefReport;
}
