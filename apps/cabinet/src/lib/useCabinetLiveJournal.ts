import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUFFER_COLLECTION_ID,
  type MediaLibraryService,
} from '@membrana/media-library-service';
import {
  bindSamplePlaybackBlobReader,
  selectSample,
  togglePlayPause,
  useSamplePlayback,
} from '@membrana/sample-playback-service';
import {
  LIVE_JOURNAL_PAGE_SIZE,
  countLiveJournalFilters,
  countLiveJournalPages,
  findReportsForTrack,
  findTrackForReport,
  matchesLiveJournalFilter,
  matchesLiveJournalSearch,
  sliceLiveJournalPage,
  type LiveJournalFilter,
  type LiveJournalItem,
} from '@membrana/telemetry-journal-service';

import { fetchMembraneNodes } from '@/api/sampleLibrary';
import { fetchMembraneMe } from '@/api/membrane';
import { deleteTelemetryJournalItems } from '@/api/journal';
import { fetchAllJournalItems } from '@/lib/fetchAllJournalItems';
import { getCabinetMediaLibrary } from '@/lib/cabinetMediaLibrary';
import { useRemoteMutation } from '@/lib/useRemoteMutation';
import { useVisibleInterval } from '@/lib/useVisibleInterval';

export const CABINET_LIVE_JOURNAL_REFRESH_MS = 1_000;

export interface CabinetJournalNode {
  readonly id: string;
  readonly label: string;
  readonly deviceId: string | null;
  readonly paired: boolean;
}

export function useCabinetLiveJournal() {
  const [nodes, setNodes] = useState<CabinetJournalNode[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [items, setItems] = useState<LiveJournalItem[]>([]);
  const [serverFilterCounts, setServerFilterCounts] = useState<Record<
    LiveJournalFilter,
    number
  > | null>(null);
  const [filter, setFilter] = useState<LiveJournalFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const [mediaService, setMediaService] = useState<MediaLibraryService | null>(null);
  const playback = useSamplePlayback();
  const { busy: clearingJournal, run: runRemoteMutation } = useRemoteMutation();

  const loadNodes = useCallback(async () => {
    const me = await fetchMembraneMe();
    const nodesData = await fetchMembraneNodes(me.membrane.id);
    const nextNodes: CabinetJournalNode[] = nodesData.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      deviceId: node.deviceId,
      paired: node.paired,
    }));
    setNodes(nextNodes);
    const firstPaired = nextNodes.find((node) => node.paired && node.deviceId);
    setSelectedDeviceId((current) => {
      if (current && nextNodes.some((node) => node.deviceId === current)) return current;
      return firstPaired?.deviceId ?? null;
    });
  }, []);

  const reloadItems = useCallback(async (options?: { readonly silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      if (!selectedDeviceId) {
        setItems([]);
        setServerFilterCounts(null);
        setMediaService(null);
        return;
      }
      const [{ items: nextItems, counts }, service] = await Promise.all([
        fetchAllJournalItems(selectedDeviceId),
        getCabinetMediaLibrary(selectedDeviceId),
      ]);
      setItems(nextItems);
      setServerFilterCounts(counts);
      setMediaService(service);
      bindSamplePlaybackBlobReader((sampleId) => service.getSampleBlob(sampleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал');
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    void loadNodes().catch((err) => {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить узлы');
      setLoading(false);
    });
  }, [loadNodes]);

  useEffect(() => {
    void reloadItems();
  }, [reloadItems]);

  useEffect(() => {
    setPage(1);
  }, [filter, search, selectedDeviceId]);

  const pollJournal = useCallback(() => {
    if (!selectedDeviceId) return;
    void reloadItems({ silent: true });
  }, [reloadItems, selectedDeviceId]);

  useVisibleInterval(pollJournal, CABINET_LIVE_JOURNAL_REFRESH_MS, Boolean(selectedDeviceId));

  const clearByFilter = useCallback(
    async (activeFilter: LiveJournalFilter) => {
      if (!selectedDeviceId || clearingJournal) return;
      setClearError(null);
      try {
        await runRemoteMutation('Очистка журнала', async () => {
          await deleteTelemetryJournalItems({
            filter: activeFilter,
            mediaDeviceId: selectedDeviceId,
          });
          await reloadItems({ silent: true });
        });
      } catch (err) {
        setClearError(err instanceof Error ? err.message : 'Не удалось очистить журнал');
      }
    },
    [clearingJournal, reloadItems, runRemoteMutation, selectedDeviceId],
  );

  const filterCounts = useMemo(
    () => serverFilterCounts ?? countLiveJournalFilters(items),
    [items, serverFilterCounts],
  );

  const filtered = useMemo(() => {
    let list = items.filter((item) => matchesLiveJournalFilter(item, filter));
    if (search.trim()) {
      list = list.filter((item) => matchesLiveJournalSearch(item, search));
    }
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [items, filter, search]);

  const activeFilterTotal = search.trim() ? filtered.length : filterCounts[filter];
  const totalPages = countLiveJournalPages(activeFilterTotal);
  const safePage = Math.min(page, totalPages);

  const displayed = useMemo(
    () => sliceLiveJournalPage(filtered, safePage - 1),
    [filtered, safePage],
  );

  const playTrack = useCallback(
    async (item: LiveJournalItem) => {
      const track = item.track;
      if (!track || !mediaService) return;
      const isActive = playback.selectedSampleId === track.sampleId;
      if (!isActive) {
        await selectSample({
          id: track.sampleId,
          title: track.title,
          collectionId: BUFFER_COLLECTION_ID,
        });
      }
      await togglePlayPause();
    },
    [mediaService, playback.selectedSampleId],
  );

  const exportTrackBlob = useCallback(
    async (item: LiveJournalItem) => {
      const track = item.track;
      if (!track || !mediaService) {
        throw new Error('Медиатека узла недоступна');
      }
      return mediaService.getSampleBlob(track.sampleId);
    },
    [mediaService],
  );

  const linkedReportCount = useCallback(
    (item: LiveJournalItem) => {
      if (item.kind !== 'track' || !item.track) return 0;
      return findReportsForTrack(items, item.track.trackId).length;
    },
    [items],
  );

  const trackTitleForReport = useCallback(
    (item: LiveJournalItem) => {
      if (item.kind !== 'report' || !item.report) return null;
      return findTrackForReport(items, item.report.trackId)?.track?.title ?? null;
    },
    [items],
  );

  return {
    nodes,
    selectedDeviceId,
    setSelectedDeviceId,
    items,
    filter,
    setFilter,
    search,
    setSearch,
    filterCounts,
    filtered,
    displayed,
    page: safePage,
    totalPages,
    pageSize: LIVE_JOURNAL_PAGE_SIZE,
    setPage,
    loading,
    error,
    clearError,
    clearingJournal,
    clearByFilter,
    reload: reloadItems,
    playTrack,
    exportTrackBlob,
    linkedReportCount,
    trackTitleForReport,
    playback,
    mediaReady: mediaService != null,
  };
}
