import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { FFT_THRESHOLD_JOURNAL_SCHEMA } from '../../../plugins/fft-threshold-test/appendFftThresholdJournalReport';
import type { FftThresholdTestReport } from '../../../plugins/fft-threshold-test/buildFftThresholdTestReport';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Parse FftThresholdTestReport from a live journal report payload (LP2). */
export function fftThresholdReportFromItem(
  item: LiveJournalItem,
): FftThresholdTestReport | null {
  if (item.kind !== 'report' || !item.report) return null;
  if (item.report.schema !== FFT_THRESHOLD_JOURNAL_SCHEMA) return null;

  const nested = item.report.payload['report'];
  if (!isRecord(nested)) return null;
  if (typeof nested.testId !== 'string') return null;
  if (!Array.isArray(nested.frames)) return null;

  return nested as unknown as FftThresholdTestReport;
}
