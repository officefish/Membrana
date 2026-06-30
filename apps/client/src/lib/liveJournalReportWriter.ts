import type { DroneDetectionReport } from '@membrana/detector-report';
import { DRONE_DETECTION_REPORT_SCHEMA_VERSION } from '@membrana/detector-report';
import {
  LIVE_JOURNAL_MODULE_NAME,
  getDefaultLiveJournalService,
  liveJournalReportClientEntryId,
} from '@membrana/telemetry-journal-service';

import {
  buildDroneDetectionSummaryText,
  isDroneDetectionConsensus,
} from '@/plugins/sample-library-drone-analysis/droneAnalysisTelemetry';

export interface AppendLiveDroneReportInput {
  readonly moduleId: string;
  readonly trackId: string;
  readonly report: DroneDetectionReport;
}

/** Append drone-detection-report/v1 linked to live journal track (TJ4). */
export async function appendLiveJournalReportFromDroneDetection(
  input: AppendLiveDroneReportInput,
): Promise<void> {
  const isDetected = isDroneDetectionConsensus(input.report);

  await getDefaultLiveJournalService().appendReport({
    clientEntryId: liveJournalReportClientEntryId(input.report.meta.reportId),
    moduleId: input.moduleId,
    moduleName: LIVE_JOURNAL_MODULE_NAME,
    report: {
      schema: DRONE_DETECTION_REPORT_SCHEMA_VERSION,
      reportId: input.report.meta.reportId,
      trackId: input.trackId,
      isDetected,
      summaryText: buildDroneDetectionSummaryText(input.report, isDetected),
      payload: {
        report: input.report,
      },
    },
  });
}
