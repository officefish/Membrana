import type { DroneDetectionBriefReport } from '@membrana/detector-report';
import {
  buildBriefDroneDetectionSummaryText,
  DRONE_DETECTION_BRIEF_SCHEMA_VERSION,
  isDroneBriefConsensus,
} from '@membrana/detector-report';
import {
  LIVE_JOURNAL_MODULE_NAME,
  getDefaultLiveJournalService,
  liveJournalReportClientEntryId,
} from '@membrana/telemetry-journal-service';

export interface AppendLiveDroneBriefReportInput {
  readonly moduleId: string;
  readonly trackId: string;
  readonly report: DroneDetectionBriefReport;
}

/** Append drone-detection-brief/v1 to live journal (fast path). */
export async function appendLiveJournalReportFromDroneBrief(
  input: AppendLiveDroneBriefReportInput,
): Promise<void> {
  const isDetected = isDroneBriefConsensus(input.report);

  await getDefaultLiveJournalService().appendReport({
    clientEntryId: liveJournalReportClientEntryId(input.report.meta.reportId),
    moduleId: input.moduleId,
    moduleName: LIVE_JOURNAL_MODULE_NAME,
    report: {
      schema: DRONE_DETECTION_BRIEF_SCHEMA_VERSION,
      reportId: input.report.meta.reportId,
      trackId: input.trackId,
      isDetected,
      summaryText: buildBriefDroneDetectionSummaryText(input.report, isDetected),
      payload: {
        report: input.report,
      },
    },
  });
}
