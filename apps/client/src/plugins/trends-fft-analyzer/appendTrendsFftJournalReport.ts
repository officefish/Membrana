import {
  LIVE_JOURNAL_MODULE_NAME,
  getDefaultLiveJournalService,
  liveJournalReportClientEntryId,
} from '@membrana/telemetry-journal-service';

import type { TrendsFftReport } from './buildTrendsFftReport';

export const TRENDS_FFT_JOURNAL_SCHEMA = 'trends-fft/v0.1' as const;

export function trendsFftSyntheticTrackId(moduleId: string, reportId: string): string {
  return `trends-fft:${moduleId}:${reportId}`;
}

export function buildTrendsFftSummaryText(report: TrendsFftReport): string {
  const modeLabel = report.mode === 'manual' ? 'ручной' : 'авто';
  const confidencePct = Math.round(report.confidence);
  return `${report.detectedStateIcon} ${report.detectedStateName} · ${confidencePct}% (${modeLabel})`;
}

export interface AppendTrendsFftJournalReportInput {
  readonly moduleId: string;
  readonly report: TrendsFftReport;
}

/** Append trends-fft/v0.1 report to live journal (LP2). */
export async function appendTrendsFftJournalReport(
  input: AppendTrendsFftJournalReportInput,
): Promise<void> {
  const { moduleId, report } = input;
  await getDefaultLiveJournalService().appendReport({
    clientEntryId: liveJournalReportClientEntryId(report.reportId),
    moduleId,
    moduleName: LIVE_JOURNAL_MODULE_NAME,
    timestamp: report.finishedAt,
    report: {
      schema: TRENDS_FFT_JOURNAL_SCHEMA,
      reportId: report.reportId,
      trackId: trendsFftSyntheticTrackId(moduleId, report.reportId),
      isDetected: report.isDetected,
      summaryText: buildTrendsFftSummaryText(report),
      payload: {
        report,
      },
    },
  });
}
