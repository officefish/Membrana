import { useEffect, useRef } from 'react';
import type { TelemetryEntry } from '@membrana/telemetry-service';
import { useTelemetryJournal } from '@membrana/telemetry-service';

import {
  createTelemetryLiveRecord,
  endTelemetryLiveRecord,
  uploadTelemetryReport,
} from '@/api/journal';
import { useNodeConnectionStore } from '@/stores/nodeConnectionStore';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function reportKindFromEntry(entry: TelemetryEntry): string {
  if (isRecord(entry.data) && typeof entry.data.schema === 'string') {
    return entry.data.schema;
  }
  return entry.type;
}

function finishedAtIso(entry: TelemetryEntry): string {
  if (isRecord(entry.data) && typeof entry.data.finishedAt === 'number') {
    return new Date(entry.data.finishedAt).toISOString();
  }
  return new Date(entry.timestamp).toISOString();
}

/** Uploads new journal entries to cabinet when client is in paired mode. */
export function useTelemetryCloudSync(): void {
  const mode = useNodeConnectionStore((s) => s.mode);
  const pairing = useNodeConnectionStore((s) => s.pairing);
  const { snapshot } = useTelemetryJournal();
  const syncedIds = useRef(new Set<string>());
  const liveRecordByModule = useRef(new Map<string, string>());

  useEffect(() => {
    if (mode !== 'paired' || !pairing?.token) return;

    const token = pairing.token;

    const syncEntry = async (entry: TelemetryEntry): Promise<void> => {
      if (syncedIds.current.has(entry.id)) return;

      try {
        if (entry.type === 'analysis') {
          await uploadTelemetryReport(token, {
            reportKind: reportKindFromEntry(entry),
            clientEntryId: entry.id,
            moduleId: entry.moduleId,
            moduleName: entry.moduleName,
            finishedAt: finishedAtIso(entry),
            payload: entry.data as Record<string, unknown>,
            tags: [...entry.tags],
          });
          syncedIds.current.add(entry.id);
          return;
        }

        if (entry.type !== 'event' || !isRecord(entry.data)) return;
        const action = entry.data.action;

        if (action === 'analysis_start') {
          const clientRecordId = `live-${entry.moduleId}-${entry.timestamp}`;
          const res = await createTelemetryLiveRecord(token, {
            recordKind: entry.moduleName,
            clientRecordId,
            moduleId: entry.moduleId,
            startedAt: new Date(entry.timestamp).toISOString(),
            payload: entry.data,
          });
          liveRecordByModule.current.set(entry.moduleId, res.liveRecord.id);
          syncedIds.current.add(entry.id);
          return;
        }

        if (action === 'analysis_stop') {
          const cloudId = liveRecordByModule.current.get(entry.moduleId);
          if (cloudId) {
            await endTelemetryLiveRecord(token, cloudId, entry.data);
            liveRecordByModule.current.delete(entry.moduleId);
          }
          syncedIds.current.add(entry.id);
        }
      } catch {
        /* best-effort sync; do not block local journal */
      }
    };

    const pending = snapshot.entries.filter((e) => !syncedIds.current.has(e.id));
    void Promise.all(pending.map((e) => syncEntry(e)));
  }, [mode, pairing, snapshot.version]);
}
