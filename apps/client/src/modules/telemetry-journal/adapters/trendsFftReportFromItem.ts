import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { TRENDS_FFT_JOURNAL_SCHEMA } from '../../../plugins/trends-fft-analyzer/appendTrendsFftJournalReport';
import type { TrendsFftReport } from '../../../plugins/trends-fft-analyzer/buildTrendsFftReport';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parse TrendsFftReport from a live journal report payload (LP2). */
export function trendsFftReportFromItem(item: LiveJournalItem): TrendsFftReport | null {
  if (item.kind !== 'report' || !item.report) return null;
  if (item.report.schema !== TRENDS_FFT_JOURNAL_SCHEMA) return null;

  const nested = item.report.payload['report'];
  if (!isRecord(nested)) return null;
  if (typeof nested.reportId !== 'string') return null;
  if (typeof nested.detectedStateName !== 'string') return null;

  return nested as unknown as TrendsFftReport;
}
