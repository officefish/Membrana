import {
  NODE_REALTIME_EVENT_TYPES,
  createNodeRealtimeEnvelope,
  type JournalAppendPayload,
} from '@membrana/core';
import {
  TELEMETRY_TRACK_SCHEMA_VERSION,
  type AppendLiveJournalReportInput,
  type AppendLiveJournalTrackInput,
  type IRealtimeJournalPushPort,
} from '@membrana/telemetry-journal-service';

import { getNodeRealtimeClient } from '@/lib/nodeRealtimeClient';

function isRealtimeEnabled(): boolean {
  const flag = import.meta.env.VITE_NODE_REALTIME_ENABLED;
  return flag !== 'false' && flag !== '0';
}

function pushJournalAppend(payload: JournalAppendPayload): void {
  if (!isRealtimeEnabled()) return;
  const client = getNodeRealtimeClient();
  if (client.getState() !== 'connected') return;
  client.send(
    createNodeRealtimeEnvelope('journal', NODE_REALTIME_EVENT_TYPES.journal.append, payload),
  );
}

/** MP7: WebSocket push for paired journal sync (REST remains fallback). */
export function createRealtimeJournalPushPort(): IRealtimeJournalPushPort {
  return {
    async pushReport(input: AppendLiveJournalReportInput): Promise<void> {
      pushJournalAppend({
        kind: 'report',
        clientEntryId: input.clientEntryId,
        moduleId: input.moduleId,
        moduleName: input.moduleName,
        reportKind: input.report.schema,
        finishedAt: new Date(input.timestamp ?? Date.now()).toISOString(),
        payload: {
          schema: input.report.schema,
          reportId: input.report.reportId,
          trackId: input.report.trackId,
          isDetected: input.report.isDetected,
          summaryText: input.report.summaryText,
          payload: input.report.payload,
        },
        tags: input.tags ? [...input.tags] : undefined,
      });
    },
    async pushTrack(input: AppendLiveJournalTrackInput): Promise<void> {
      pushJournalAppend({
        kind: 'track',
        clientEntryId: input.clientEntryId,
        moduleId: input.moduleId,
        moduleName: input.moduleName,
        reportKind: TELEMETRY_TRACK_SCHEMA_VERSION,
        startedAt: input.track.createdAtIso,
        payload: {
          item: input.track,
          moduleName: input.moduleName,
          tags: input.tags ?? [],
        },
        tags: input.tags ? [...input.tags] : undefined,
      });
    },
  };
}
