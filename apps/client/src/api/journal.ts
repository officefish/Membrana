import { getCabinetApiBase } from './pairing';

export interface UploadTelemetryReportBody {
  reportKind: string;
  clientEntryId?: string;
  moduleId?: string;
  moduleName?: string;
  finishedAt: string;
  payload: Record<string, unknown>;
  tags?: string[];
}

export interface UploadTelemetryLiveRecordBody {
  recordKind: string;
  clientRecordId?: string;
  moduleId?: string;
  startedAt: string;
  payload: Record<string, unknown>;
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(', ');
    if (typeof body.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed';
}

export async function uploadTelemetryReport(
  token: string,
  body: UploadTelemetryReportBody,
): Promise<{ report: { id: string }; deduplicated: boolean }> {
  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/reports`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { report: { id: string }; deduplicated: boolean };
}

export async function createTelemetryLiveRecord(
  token: string,
  body: UploadTelemetryLiveRecordBody,
): Promise<{ liveRecord: { id: string }; deduplicated: boolean }> {
  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/live-records`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as { liveRecord: { id: string }; deduplicated: boolean };
}

export async function endTelemetryLiveRecord(
  token: string,
  recordId: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const res = await fetch(`${getCabinetApiBase()}/v1/telemetry/live-records/${recordId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'ended',
      ...(payload ? { payload } : {}),
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
