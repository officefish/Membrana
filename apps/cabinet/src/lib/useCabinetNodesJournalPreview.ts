import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import type { JournalAppendPayload } from '@membrana/core';
import { fetchTelemetryJournalItems } from '@/api/journal';
import { getCabinetNodeRealtimeClient } from '@/lib/cabinetNodeRealtimeClient';
import { findLastJournalTrack } from '@/lib/findLastJournalTrack';
import { CABINET_LIVE_JOURNAL_REFRESH_MS } from '@/lib/useCabinetLiveJournal';
import { useVisibleInterval } from '@/lib/useVisibleInterval';

export interface NodeJournalPreviewState {
  readonly lastTrack: LiveJournalItem | null;
  readonly loading: boolean;
}

async function fetchLastTrackForDevice(mediaDeviceId: string): Promise<LiveJournalItem | null> {
  const batch = await fetchTelemetryJournalItems({
    mediaDeviceId,
    filter: 'tracks',
    limit: 20,
  });
  return findLastJournalTrack(batch.items);
}

/**
 * SF7: per-node last journal track from REST cache + WS append (cabinet live journal parity).
 */
export function useCabinetNodesJournalPreview(
  membraneId: string | null,
  deviceIds: readonly string[],
): {
  readonly getPreview: (deviceId: string) => NodeJournalPreviewState;
} {
  const [itemsByDevice, setItemsByDevice] = useState<Record<string, LiveJournalItem[]>>({});
  const [loadingByDevice, setLoadingByDevice] = useState<Record<string, boolean>>({});

  const pairedDeviceIds = useMemo(
    () => [...new Set(deviceIds.filter((id) => id.length > 0))],
    [deviceIds],
  );
  const deviceKey = pairedDeviceIds.join('\0');

  const reloadDevice = useCallback(async (mediaDeviceId: string, options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoadingByDevice((prev) => ({ ...prev, [mediaDeviceId]: true }));
    }
    try {
      const last = await fetchLastTrackForDevice(mediaDeviceId);
      setItemsByDevice((prev) => ({
        ...prev,
        [mediaDeviceId]: last ? [last] : [],
      }));
    } catch {
      /* best-effort preview */
    } finally {
      if (!options?.silent) {
        setLoadingByDevice((prev) => ({ ...prev, [mediaDeviceId]: false }));
      }
    }
  }, []);

  const reloadAll = useCallback(
    async (options?: { silent?: boolean }) => {
      if (pairedDeviceIds.length === 0) return;
      await Promise.all(pairedDeviceIds.map((id) => reloadDevice(id, options)));
    },
    [pairedDeviceIds, reloadDevice],
  );

  useEffect(() => {
    setItemsByDevice({});
    setLoadingByDevice({});
    if (pairedDeviceIds.length === 0) return;
    void reloadAll();
  }, [deviceKey, pairedDeviceIds.length, reloadAll]);

  useVisibleInterval(
    () => {
      void reloadAll({ silent: true });
    },
    CABINET_LIVE_JOURNAL_REFRESH_MS,
    pairedDeviceIds.length > 0,
  );

  useEffect(() => {
    if (!membraneId) return undefined;
    const client = getCabinetNodeRealtimeClient();
    client.connect(membraneId);
    const unsubJournal = client.subscribeJournalAppend((envelope) => {
      const body = envelope.payload as JournalAppendPayload & { serverId?: string };
      if (body.kind !== 'track') return;
      void reloadAll({ silent: true });
    });
    return unsubJournal;
  }, [membraneId, reloadAll]);

  const getPreview = useCallback(
    (deviceId: string): NodeJournalPreviewState => {
      const items = itemsByDevice[deviceId] ?? [];
      return {
        lastTrack: findLastJournalTrack(items),
        loading: loadingByDevice[deviceId] ?? false,
      };
    },
    [itemsByDevice, loadingByDevice],
  );

  return { getPreview };
}
