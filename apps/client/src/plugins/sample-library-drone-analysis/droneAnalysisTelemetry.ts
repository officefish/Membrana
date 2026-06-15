import type { DroneDetectionReport } from '@membrana/detector-report';

/** Any detector marked the sample as drone. */
export function isDroneDetectionConsensus(report: DroneDetectionReport): boolean {
  return report.verdicts.some((section) => section.isDrone);
}

export function buildDroneDetectionSummaryText(
  report: DroneDetectionReport,
  isDetected: boolean,
): string {
  const label = report.meta.sampleTitle ?? report.meta.sampleId;
  const droneCount = report.verdicts.filter((section) => section.isDrone).length;
  const verdict = isDetected ? 'дрон' : 'не дрон';
  return `${verdict}: ${label} · ${droneCount}/${report.verdicts.length} детектор(ов)`;
}

/** Offline sample-library journal write disabled (TJ3/TJ4 live journal). */
export function logDroneDetectionReport(
  _moduleId: string,
  _report: DroneDetectionReport,
): string | null {
  return null;
}
