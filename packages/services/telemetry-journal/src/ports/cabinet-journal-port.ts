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

import type { LiveJournalFilter, LiveJournalItem } from '../types.js';

/** Query for unified live journal list (TJ6, TJ9). */
export interface ListCabinetJournalItemsQuery {
  readonly limit?: number;
  readonly mediaDeviceId?: string;
  readonly cursor?: string | null;
  readonly filter?: LiveJournalFilter;
}

export interface PaginatedCabinetJournalItems {
  readonly items: readonly LiveJournalItem[];
  readonly nextCursor: string | null;
}

/** Remote journal persistence via cabinet API (TJ2). */
export interface ICabinetJournalPort {
  listReports(limit?: number): Promise<readonly CabinetTelemetryReportDto[]>;
  listLiveRecords(limit?: number): Promise<readonly CabinetTelemetryLiveRecordDto[]>;
  /** Unified live journal items (TJ6); optional — falls back to dual list. */
  listJournalItems?(
    query?: ListCabinetJournalItemsQuery,
  ): Promise<readonly LiveJournalItem[] | PaginatedCabinetJournalItems>;
  createReport(
    input: CreateCabinetTelemetryReportInput,
  ): Promise<{ readonly deduplicated: boolean }>;
  createLiveRecord(
    input: CreateCabinetTelemetryLiveRecordInput,
  ): Promise<{ readonly deduplicated: boolean }>;
}
