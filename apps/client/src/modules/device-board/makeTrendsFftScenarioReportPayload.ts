import { createScenarioReportPayload, type ScenarioReportPayload } from '@membrana/core';

import type { TrendsFftReport } from '@/plugins/trends-fft-analyzer/buildTrendsFftReport';
import {
  buildTrendsFftSummaryText,
  trendsFftSyntheticTrackId,
} from '@/plugins/trends-fft-analyzer/appendTrendsFftJournalReport';

/** Канон schema PublishReport для trends FFT (parity с plugin sidebar). */
export const TRENDS_FFT_SCENARIO_REPORT_SCHEMA = 'trends-fft/v0.1' as const;

/** ScenarioReportPayload для MakeReportFromAnalysis → PublishReport (B2). */
export function createTrendsFftScenarioReportPayload(
  moduleId: string,
  report: TrendsFftReport,
): ScenarioReportPayload {
  return createScenarioReportPayload({
    schema: TRENDS_FFT_SCENARIO_REPORT_SCHEMA,
    reportId: report.reportId,
    trackId: trendsFftSyntheticTrackId(moduleId, report.reportId),
    isDetected: report.isDetected,
    summaryText: buildTrendsFftSummaryText(report),
    payload: { report },
  });
}
