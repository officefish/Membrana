import { createReportId } from './createReportId.js';
import { formatReportTimestampMoscow } from './formatReportTimestampMoscow.js';
import {
  DRONE_DETECTION_REPORT_SCHEMA_VERSION,
  type BuildDroneDetectionReportInput,
  type DroneDetectionReport,
} from './types.js';

/**
 * Assemble a canonical drone detection report DTO with meta (UUID, Moscow time, schema).
 */
export function buildDroneDetectionReport(
  input: BuildDroneDetectionReportInput,
): DroneDetectionReport {
  const createdAt = input.createdAt ?? new Date();
  const reportId = input.reportId ?? createReportId();

  return {
    meta: {
      reportId,
      createdAtIso: createdAt.toISOString(),
      createdAtMoscow: formatReportTimestampMoscow(createdAt),
      schemaVersion: DRONE_DETECTION_REPORT_SCHEMA_VERSION,
      sampleId: input.sample.id,
      sampleTitle: input.sample.title,
      sampleRate: input.sample.sampleRate,
      sampleDurationSec: input.sample.durationSec,
      ...(input.sample.groundTruthLabel !== undefined
        ? { groundTruthLabel: input.sample.groundTruthLabel }
        : {}),
    },
    verdicts: input.verdicts,
  };
}
