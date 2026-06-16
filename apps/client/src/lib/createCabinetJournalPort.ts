import {
  cabinetRowsToJournalItems,
  type CreateCabinetTelemetryLiveRecordInput,
  type CreateCabinetTelemetryReportInput,
  type ICabinetJournalPort,
  type ListCabinetJournalItemsQuery,
} from '@membrana/telemetry-journal-service';

import {
  createTelemetryLiveRecord,
  deleteTelemetryJournalItems,
  listTelemetryJournalItems,
  listTelemetryLiveRecords,
  listTelemetryReports,
  uploadTelemetryReport,
} from '@/api/journal';

/** Cabinet journal port for live journal sync (TJ2). */
export function createCabinetJournalPort(token: string): ICabinetJournalPort {
  return {
    async listReports(limit) {
      const res = await listTelemetryReports(token, limit);
      return res.reports;
    },
    async listLiveRecords(limit) {
      const res = await listTelemetryLiveRecords(token, limit);
      return res.liveRecords;
    },
    async listJournalItems(query?: ListCabinetJournalItemsQuery) {
      const unified = await listTelemetryJournalItems(token, {
        limit: query?.limit,
        mediaDeviceId: query?.mediaDeviceId,
        cursor: query?.cursor ?? undefined,
        filter: query?.filter,
      });
      if (unified) return unified;

      const [reports, liveRecords] = await Promise.all([
        listTelemetryReports(token, query?.limit),
        listTelemetryLiveRecords(token, query?.limit),
      ]);
      return cabinetRowsToJournalItems(reports.reports, liveRecords.liveRecords);
    },
    async createReport(input: CreateCabinetTelemetryReportInput) {
      const res = await uploadTelemetryReport(token, {
        reportKind: input.reportKind,
        clientEntryId: input.clientEntryId,
        moduleId: input.moduleId,
        moduleName: input.moduleName,
        finishedAt: input.finishedAt,
        payload: { ...input.payload },
        tags: [...input.tags],
      });
      return { deduplicated: res.deduplicated };
    },
    async createLiveRecord(input: CreateCabinetTelemetryLiveRecordInput) {
      const res = await createTelemetryLiveRecord(token, {
        recordKind: input.recordKind,
        clientRecordId: input.clientRecordId,
        moduleId: input.moduleId,
        startedAt: input.startedAt,
        payload: { ...input.payload },
      });
      return { deduplicated: res.deduplicated };
    },
    async deleteJournalItems(query) {
      return deleteTelemetryJournalItems(token, query);
    },
  };
}
