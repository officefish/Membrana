import type { TelemetryJournalConfig } from './types.js';

export const DEFAULT_TELEMETRY_JOURNAL_CONFIG: TelemetryJournalConfig = {
  maxEntries: 1000,
  maxReportDedupeIds: 1000,
};
