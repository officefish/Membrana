/** New UUID v4 for a drone detection report. */
export function createReportId(): string {
  return crypto.randomUUID();
}
