import type { DroneDetectionBriefReport } from '@membrana/detector-report';

export interface RequestDetailedDroneReportInput {
  readonly moduleId: string;
  readonly briefReport: DroneDetectionBriefReport;
  readonly sampleId: string;
  readonly journalTrackId: string | null;
}

export interface RequestDetailedDroneReportResult {
  readonly status: 'pending' | 'ready' | 'error';
  readonly message?: string;
}

/**
 * Request full DDR (drone-detection-report/v1) from server for a brief journal row.
 * LP1b: server endpoint TBD (background-media / cabinet); client only enqueues for now.
 */
export async function requestDetailedDroneReport(
  input: RequestDetailedDroneReportInput,
): Promise<RequestDetailedDroneReportResult> {
  void input;
  return {
    status: 'pending',
    message:
      'Подробный отчёт будет подготовлен на сервере (API в LP1b). Краткий отчёт уже в журнале.',
  };
}
