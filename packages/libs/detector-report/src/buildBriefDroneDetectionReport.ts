import { createReportId } from './createReportId.js';
import { formatReportTimestampMoscow } from './formatReportTimestampMoscow.js';
import {
  DRONE_DETECTION_BRIEF_SCHEMA_VERSION,
  type BuildDroneDetectionBriefReportInput,
  type DroneDetectionBriefReport,
  type DetectorVerdictInput,
  type DroneDetectorName,
} from './types.js';

/**
 * Assemble a brief drone detection report (verdict summary only).
 * Intended for live stream / fast journal append; detailed DDR is fetched separately.
 */
export function buildBriefDroneDetectionReport(
  input: BuildDroneDetectionBriefReportInput,
): DroneDetectionBriefReport {
  const createdAt = input.createdAt ?? new Date();
  const reportId = input.reportId ?? createReportId();

  return {
    meta: {
      reportId,
      createdAtIso: createdAt.toISOString(),
      createdAtMoscow: formatReportTimestampMoscow(createdAt),
      schemaVersion: DRONE_DETECTION_BRIEF_SCHEMA_VERSION,
      sampleId: input.sample.id,
      sampleTitle: input.sample.title,
      sampleRate: input.sample.sampleRate,
      sampleDurationSec: input.sample.durationSec,
      ...(input.analysisMode !== undefined ? { analysisMode: input.analysisMode } : {}),
      detailedReportStatus: input.detailedReportStatus ?? 'none',
      ...(input.detailedReportId !== undefined
        ? { detailedReportId: input.detailedReportId }
        : {}),
    },
    verdicts: input.verdicts,
  };
}

export function mapVerdictsToBrief(
  verdicts: readonly (DetectorVerdictInput & { readonly detectorName: DroneDetectorName })[],
): DroneDetectionBriefReport['verdicts'] {
  return verdicts.map((verdict) => ({
    detectorName: verdict.detectorName,
    detectorFamily: 'dsp' as const,
    isDrone: verdict.isDrone,
    confidence: verdict.confidence,
  }));
}

export function isDroneBriefConsensus(report: DroneDetectionBriefReport): boolean {
  return report.verdicts.some((verdict) => verdict.isDrone);
}

export function buildBriefDroneDetectionSummaryText(
  report: DroneDetectionBriefReport,
  isDetected: boolean,
): string {
  const label = report.meta.sampleTitle ?? report.meta.sampleId;
  const droneCount = report.verdicts.filter((verdict) => verdict.isDrone).length;
  const verdict = isDetected ? 'дрон' : 'не дрон';
  return `${verdict}: ${label} · ${droneCount}/${report.verdicts.length} детектор(ов)`;
}
