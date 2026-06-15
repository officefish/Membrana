/** Cabinet telemetry report row (MP5 journal API). */
export interface CabinetTelemetryReportDto {
  readonly id: string;
  readonly reportKind: string;
  readonly clientEntryId: string | null;
  readonly moduleId: string | null;
  readonly moduleName: string | null;
  readonly finishedAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly tags: readonly string[];
}

/** Cabinet live record row (MP5 journal API). */
export interface CabinetTelemetryLiveRecordDto {
  readonly id: string;
  readonly recordKind: string;
  readonly clientRecordId: string | null;
  readonly moduleId: string | null;
  readonly startedAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly status: 'active' | 'ended';
}

export interface CreateCabinetTelemetryReportInput {
  readonly reportKind: string;
  readonly clientEntryId: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly finishedAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly tags: readonly string[];
}

export interface CreateCabinetTelemetryLiveRecordInput {
  readonly recordKind: string;
  readonly clientRecordId: string;
  readonly moduleId: string;
  readonly startedAt: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

/** Remote journal persistence via cabinet API (TJ2). */
export interface ICabinetJournalPort {
  listReports(limit?: number): Promise<readonly CabinetTelemetryReportDto[]>;
  listLiveRecords(limit?: number): Promise<readonly CabinetTelemetryLiveRecordDto[]>;
  createReport(
    input: CreateCabinetTelemetryReportInput,
  ): Promise<{ readonly deduplicated: boolean }>;
  createLiveRecord(
    input: CreateCabinetTelemetryLiveRecordInput,
  ): Promise<{ readonly deduplicated: boolean }>;
}
