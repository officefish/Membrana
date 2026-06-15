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
  countLiveJournalFilters,
  findReportsForTrack,
  findTrackForReport,
  matchesLiveJournalFilter,
  type LiveJournalFilter,
  type LiveJournalItem,
} from '@membrana/telemetry-journal-service';

import { fetchMembraneNodes } from '@/api/sampleLibrary';
import { fetchTelemetryJournalItems } from '@/api/journal';
import { fetchMembraneMe } from '@/api/membrane';
import { getCabinetMediaLibrary } from '@/lib/cabinetMediaLibrary';

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
  const [filter, setFilter] = useState<LiveJournalFilter>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaService, setMediaService] = useState<MediaLibraryService | null>(null);
  const playback = useSamplePlayback();

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

  const reloadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!selectedDeviceId) {
        setItems([]);
        setMediaService(null);
        return;
      }
      const [nextItems, service] = await Promise.all([
        fetchTelemetryJournalItems(200, selectedDeviceId),
        getCabinetMediaLibrary(selectedDeviceId),
      ]);
      setItems(nextItems);
      setMediaService(service);
      bindSamplePlaybackBlobReader((sampleId) => service.getSampleBlob(sampleId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить журнал');
    } finally {
      setLoading(false);
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

  const filterCounts = useMemo(() => countLiveJournalFilters(items), [items]);

  const displayed = useMemo(() => {
    let list = items.filter((item) => matchesLiveJournalFilter(item, filter));
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((item) => {
        if (item.moduleName.toLowerCase().includes(query)) return true;
        if (item.moduleId.toLowerCase().includes(query)) return true;
        if (item.tags.some((tag) => tag.toLowerCase().includes(query))) return true;
        if (item.track?.title.toLowerCase().includes(query)) return true;
        if (item.track?.sampleId.toLowerCase().includes(query)) return true;
        if (item.report?.summaryText?.toLowerCase().includes(query)) return true;
        if (item.report?.trackId.toLowerCase().includes(query)) return true;
        return false;
      });
    }
    return [...list].sort((a, b) => b.timestamp - a.timestamp);
  }, [items, filter, search]);

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
    displayed,
    loading,
    error,
    reload: reloadItems,
    playTrack,
    exportTrackBlob,
    linkedReportCount,
    trackTitleForReport,
    playback,
    mediaReady: mediaService != null,
  };
}
