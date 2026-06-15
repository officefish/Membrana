export interface CreateTelemetryReportDto {
  reportKind: string;
  clientEntryId?: string;
  moduleId?: string;
  moduleName?: string;
  finishedAt: string;
  payload: Record<string, unknown>;
  tags?: string[];
}

export interface CreateTelemetryLiveRecordDto {
  recordKind: string;
  clientRecordId?: string;
  moduleId?: string;
  startedAt: string;
  payload: Record<string, unknown>;
}

export interface UpdateTelemetryLiveRecordDto {
  payload?: Record<string, unknown>;
  status?: 'active' | 'ended';
  endedAt?: string;
}

export interface ListJournalQueryDto {
  limit?: string;
  /** Filter journal rows by paired device (TJ6). */
  mediaDeviceId?: string;
  /** Opaque cursor from prior page (TJ9). */
  cursor?: string;
  /** Live journal filter (TJ9). */
  filter?: string;
}
