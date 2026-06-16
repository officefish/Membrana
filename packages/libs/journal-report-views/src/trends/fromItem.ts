import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import type { TrendsFftReport } from './types';

export const TRENDS_FFT_JOURNAL_SCHEMA = 'trends-fft/v0.1' as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parse a TrendsFftReport from a live journal report payload (LP2/LP5). */
export function trendsFftReportFromItem(item: LiveJournalItem): TrendsFftReport | null {
  if (item.kind !== 'report' || !item.report) return null;
  if (item.report.schema !== TRENDS_FFT_JOURNAL_SCHEMA) return null;

  const nested = item.report.payload['report'];
  if (!isRecord(nested)) return null;
  if (typeof nested.reportId !== 'string') return null;
  if (typeof nested.detectedStateName !== 'string') return null;

  return nested as unknown as TrendsFftReport;
}
