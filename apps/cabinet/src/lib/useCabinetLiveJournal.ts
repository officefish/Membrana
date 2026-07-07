import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getLiveJournalSoundClass,
  liveJournalItemFromJournalAppendPayload,
  matchesLiveJournalFilter,
  matchesLiveJournalSearch,
  sliceLiveJournalPage,
  type LiveJournalFilter,
  type LiveJournalItem,
  type LiveJournalSoundClassFilter,
} from '@membrana/telemetry-journal-service';
import type { AnalysisBriefPayload, JournalAppendPayload } from '@membrana/core';

import { fetchTelemetryJournalItems } from '@/api/journal';
import { fetchMembraneNodes } from '@/api/sampleLibrary';
import { fetchMembraneMe } from '@/api/membrane';
import { deleteTelemetryJournalItems } from '@/api/journal';
import { fetchAllJournalItems } from '@/lib/fetchAllJournalItems';
import {
  getCabinetNodeRealtimeClient,
  type CabinetRealtimeClientState,
} from '@/lib/cabinetNodeRealtimeClient';
import {
  getCabinetMediaLibrary,
  invalidateCabinetMediaLibrary,
} from '@/lib/cabinetMediaLibrary';
import { mergeJournalItemsByClientEntryId } from '@/lib/mergeJournalItems';
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
  const [membraneId, setMembraneId] = useState<string | null>(null);
  const [realtimeState, setRealtimeState] = useState<CabinetRealtimeClientState>('disconnected');
  const [lastMicBrief, setLastMicBrief] = useState<AnalysisBriefPayload | null>(null);
  const [nodes, setNodes] = useState<CabinetJournalNode[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [items, setItems] = useState<LiveJournalItem[]>([]);
  const [serverFilterCounts, setServerFilterCounts] = useState<Record<
    LiveJournalFilter,
    number
  > | null>(null);
  const [filter, setFilter] = useState<LiveJournalFilter>('all');
  const [soundClassFilter, setSoundClassFilter] = useState<LiveJournalSoundClassFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [journalLoading, setJournalLoading] = useState(true);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);
  const [mediaService, setMediaService] = useState<MediaLibraryService | null>(null);
  const fullCrawlGeneration = useRef(0);
  const playback = useSamplePlayback();
  const { busy: clearingJournal, run: runRemoteMutation } = useRemoteMutation();

  const loadNodes = useCallback(async () => {
    const me = await fetchMembraneMe();
    setMembraneId(me.membrane.id);
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

  const fetchJournalPage = useCallback(async (mediaDeviceId: string) => {
    return fetchTelemetryJournalItems({
      limit: LIVE_JOURNAL_PAGE_SIZE,
      mediaDeviceId,
      filter: 'all',
    });
  }, []);

  const reloadJournalItems = useCallback(
    async (options?: { readonly silent?: boolean; readonly full?: boolean }) => {
      if (!selectedDeviceId) {
        setItems([]);
        setServerFilterCounts(null);
        return;
      }
      if (!options?.silent) {
        setJournalLoading(true);
      }
      setError(null);
      try {
        if (options?.full) {
          const { items: nextItems, counts } = await fetchAllJournalItems(selectedDeviceId);
          setItems(nextItems);
          setServerFilterCounts(counts);
          return;
        }

        const batch = await fetchJournalPage(selectedDeviceId);
        setItems((prev) =>
          options?.silent
            ? mergeJournalItemsByClientEntryId(prev, batch.items)
            : batch.items,
        );
        setServerFilterCounts(batch.counts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал');
      } finally {
        if (!options?.silent) {
          setJournalLoading(false);
        }
      }
    },
    [fetchJournalPage, selectedDeviceId],
  );

  const crawlFullJournalInBackground = useCallback(() => {
    if (!selectedDeviceId) return;
    const generation = ++fullCrawlGeneration.current;
    void fetchAllJournalItems(selectedDeviceId)
      .then(({ items: nextItems, counts }) => {
        if (generation !== fullCrawlGeneration.current) return;
        setItems(nextItems);
        setServerFilterCounts(counts);
      })
      .catch(() => {
        /* background crawl is best-effort */
      });
  }, [selectedDeviceId]);

  useEffect(() => {
    void loadNodes().catch((err) => {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить узлы');
      setJournalLoading(false);
    });
  }, [loadNodes]);

  useEffect(() => {
    void reloadJournalItems().then(() => {
      crawlFullJournalInBackground();
    });
  }, [crawlFullJournalInBackground, reloadJournalItems]);

  useEffect(() => {
    if (!selectedDeviceId) {
      setMediaService(null);
      setMediaError(null);
      return;
    }

    let cancelled = false;
    setMediaLoading(true);
    setMediaError(null);

    void getCabinetMediaLibrary(selectedDeviceId)
      .then((service) => {
        if (cancelled) return;
        setMediaService(service);
        bindSamplePlaybackBlobReader((sampleId: string) => service.getSampleBlob(sampleId));
      })
      .catch((err) => {
        if (cancelled) return;
        invalidateCabinetMediaLibrary();
        setMediaService(null);
        setMediaError(err instanceof Error ? err.message : 'Медиатека узла недоступна');
      })
      .finally(() => {
        if (!cancelled) setMediaLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDeviceId]);

  useEffect(() => {
    setPage(1);
  }, [filter, search, selectedDeviceId, soundClassFilter]);

  const pollJournal = useCallback(() => {
    if (!selectedDeviceId) return;
    void reloadJournalItems({ silent: true });
  }, [reloadJournalItems, selectedDeviceId]);

  useVisibleInterval(pollJournal, CABINET_LIVE_JOURNAL_REFRESH_MS, Boolean(selectedDeviceId));

  useEffect(() => {
    if (!membraneId) return undefined;
    const client = getCabinetNodeRealtimeClient();
    client.connect(membraneId);
    const unsubState = client.subscribeState(setRealtimeState);
    const unsubJournal = client.subscribeJournalAppend((envelope) => {
      const body = envelope.payload as JournalAppendPayload & { serverId?: string };
      const item = liveJournalItemFromJournalAppendPayload(body, envelope.ts);
      if (!item) return;
      setItems((prev) => mergeJournalItemsByClientEntryId(prev, [item]));
    });
    const unsubMic = client.subscribeMicBrief((payload) => {
      setLastMicBrief(payload);
    });
    return () => {
      unsubState();
      unsubJournal();
      unsubMic();
      // CX2: клиент — общий синглтон всех разделов кабинета; disconnect() здесь
      // рвал runtime/board-подписки раздела «Узлы» при уходе из журнала.
      // Жизненный цикл сокета принадлежит сессии кабинета (logout), не разделу.
    };
  }, [membraneId]);

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
          await reloadJournalItems({ silent: true, full: true });
        });
      } catch (err) {
        setClearError(err instanceof Error ? err.message : 'Не удалось очистить журнал');
      }
    },
    [clearingJournal, reloadJournalItems, runRemoteMutation, selectedDeviceId],
  );

  const filterCounts = useMemo(
    () => serverFilterCounts ?? countLiveJournalFilters(items),
    [items, serverFilterCounts],
  );

  const filtered = useMemo(() => {
    let list = items.filter((item) => matchesLiveJournalFilter(item, filter));
    if (soundClassFilter !== 'all') {
      list = list.filter((item) => getLiveJournalSoundClass(item) === soundClassFilter);
    }
    if (search.trim()) {
      list = list.filter((item) => matchesLiveJournalSearch(item, search));
    }
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [items, filter, search, soundClassFilter]);

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

  const reload = useCallback(async () => {
    await reloadJournalItems({ full: true });
    crawlFullJournalInBackground();
  }, [crawlFullJournalInBackground, reloadJournalItems]);

  return {
    nodes,
    selectedDeviceId,
    setSelectedDeviceId,
    items,
    filter,
    setFilter,
    soundClassFilter,
    setSoundClassFilter,
    search,
    setSearch,
    filterCounts,
    filtered,
    displayed,
    page: safePage,
    totalPages,
    pageSize: LIVE_JOURNAL_PAGE_SIZE,
    setPage,
    loading: journalLoading,
    journalLoading,
    mediaLoading,
    error,
    mediaError,
    clearError,
    clearingJournal,
    clearByFilter,
    reload,
    playTrack,
    exportTrackBlob,
    linkedReportCount,
    trackTitleForReport,
    playback,
    mediaReady: mediaService != null,
    realtimeState,
    lastMicBrief,
  };
}
