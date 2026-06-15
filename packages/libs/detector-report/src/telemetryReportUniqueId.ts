/** Stable telemetry dedupe key for a drone detection report entry. */
export function droneDetectionTelemetryReportUniqueId(reportId: string): string {
  return `drone-report-${reportId}`;
}
