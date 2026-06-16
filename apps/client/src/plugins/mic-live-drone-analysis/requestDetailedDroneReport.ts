import type { DroneDetectionBriefReport, DroneDetectionReport } from '@membrana/detector-report';

import { resolveMediaApiBase } from '@/api/pairing';
import { appendLiveJournalReportFromDroneDetection } from '@/lib/liveJournalReportWriter';
import { readPersistedPairedCredentials } from '@/lib/resolveMediaLibraryBackend';

import { micLiveDronePluginState } from './micLiveDronePluginState';

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

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || `Ошибка сервера (${res.status})`;
}

/**
 * Request the full DDR (drone-detection-report/v1) from background-media for a brief
 * journal row (LP1b). The server decodes the WAV clip, runs the shared orchestrator,
 * and returns the report; the client links it to the live journal and updates state.
 */
export async function requestDetailedDroneReport(
  input: RequestDetailedDroneReportInput,
): Promise<RequestDetailedDroneReportResult> {
  const reportId = input.briefReport.meta.reportId;
  const creds = readPersistedPairedCredentials();
  if (!creds) {
    const message = 'Подробный отчёт доступен только в paired-режиме (нет связи с сервером).';
    micLiveDronePluginState.setDetailedReportError(reportId, message);
    return { status: 'error', message };
  }

  try {
    const base = resolveMediaApiBase(creds.mediaApiUrl);
    const url = `${base}/v1/devices/${encodeURIComponent(
      creds.deviceId,
    )}/samples/${encodeURIComponent(input.sampleId)}/drone-detection-report`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Membrana-Token': creds.mediaToken,
        'X-Membrana-Device-Id': creds.deviceId,
      },
    });

    if (!res.ok) {
      const message = await parseError(res);
      micLiveDronePluginState.setDetailedReportError(reportId, message);
      return { status: 'error', message };
    }

    const report = (await res.json()) as DroneDetectionReport;

    await appendLiveJournalReportFromDroneDetection({
      moduleId: input.moduleId,
      trackId: input.journalTrackId ?? report.meta.reportId,
      report,
    });

    micLiveDronePluginState.setDetailedReportReady(report);
    return { status: 'ready', message: 'Подробный отчёт готов и записан в журнал.' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Не удалось получить подробный отчёт';
    micLiveDronePluginState.setDetailedReportError(reportId, message);
    return { status: 'error', message };
  }
}
