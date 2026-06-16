import {
  LIVE_JOURNAL_MODULE_NAME,
  getDefaultLiveJournalService,
  liveJournalReportClientEntryId,
} from '@membrana/telemetry-journal-service';

import type { FftThresholdTestReport } from './buildFftThresholdTestReport';

export const FFT_THRESHOLD_JOURNAL_SCHEMA = 'fft-threshold-test/v0.2' as const;

export function fftThresholdSyntheticTrackId(moduleId: string, testId: string): string {
  return `fft-threshold:${moduleId}:${testId}`;
}

export function buildFftThresholdSummaryText(report: FftThresholdTestReport): string {
  const modeLabel = report.mode === 'manual' ? 'ручной' : 'авто';
  const passPct = Math.round(report.passRate * 100);
  const verdict = report.isDetected ? 'порог пройден' : 'ниже порога';
  return `FFT порог (${modeLabel}): ${report.passedCount}/${report.frameCount} кадров · ${passPct}% · ${verdict}`;
}

export interface AppendFftThresholdJournalReportInput {
  readonly moduleId: string;
  readonly report: FftThresholdTestReport;
}

/** Append fft-threshold-test/v0.2 report to live journal (LP2). */
export async function appendFftThresholdJournalReport(
  input: AppendFftThresholdJournalReportInput,
): Promise<void> {
  const { moduleId, report } = input;
  await getDefaultLiveJournalService().appendReport({
    clientEntryId: liveJournalReportClientEntryId(report.testId),
    moduleId,
    moduleName: LIVE_JOURNAL_MODULE_NAME,
    timestamp: report.finishedAt,
    report: {
      schema: FFT_THRESHOLD_JOURNAL_SCHEMA,
      reportId: report.testId,
      trackId: fftThresholdSyntheticTrackId(moduleId, report.testId),
      isDetected: report.isDetected,
      summaryText: buildFftThresholdSummaryText(report),
      payload: {
        report,
      },
    },
  });
}
