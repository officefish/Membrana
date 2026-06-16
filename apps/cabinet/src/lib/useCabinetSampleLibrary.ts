import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUFFER_COLLECTION_ID,
  DEFAULT_SAMPLES_PAGE_SIZE,
  TARIFF_DATASET_SYSTEM_KEY,
  isQuotaFull,
  type Collection,
  type MediaSample,
  type PaginatedSamples,
} from '@membrana/media-library-service';
import {
  bindSamplePlaybackBlobReader,
  disposeSamplePlayback,
  selectSample,
  togglePlayPause,
  useSamplePlayback,
  useSamplePlaybackEscapeKey,
} from '@membrana/sample-playback-service';

import {
  fetchMembraneCatalog,
  fetchMembraneNodes,
  patchCatalogSample,
  type MembraneCatalog,
  type MembraneCatalogSample,
  type MembraneNodeLibrary,
} from '@/api/sampleLibrary';
import { fetchMembraneMe } from '@/api/membrane';
import { useAuth } from '@/context/AuthContext';
import { catalogSampleToMedia } from '@/lib/catalogSampleAdapter';
import {
  DEFAULT_IMPORT_CLASS,
  type LibrarySelection,
} from '@/lib/cabinetSampleLibraryTypes';
import { invalidateCabinetMediaLibrary } from '@/lib/cabinetMediaLibrary';
import { downloadBlob, extensionFromMime } from '@/lib/downloadBlob';
import { useCabinetMediaLibrary } from '@/lib/useCabinetMediaLibrary';
import { useCabinetToast } from '@/lib/useCabinetToast';
import { runRemoteMutation } from '@/lib/remoteMutation';
import type { UpdateSampleLabelNotes } from '@membrana/media-library-service';

export type { LibrarySelection };

export function useCabinetSampleLibrary() {
  useSamplePlaybackEscapeKey();

  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [membraneId, setMembraneId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<MembraneCatalog | null>(null);
  const [nodes, setNodes] = useState<MembraneNodeLibrary[]>([]);
  const [selection, setSelection] = useState<LibrarySelection>({ kind: 'catalog' });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [newCollectionName, setNewCollectionName] = useState('');
  const [mediaReloadNonce, setMediaReloadNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [labelSavingId, setLabelSavingId] = useState<string | null>(null);
  const [labelAnnotateError, setLabelAnnotateError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [samplesPageByKey, setSamplesPageByKey] = useState<Record<string, number>>({});
  const [samplesPageLoading, setSamplesPageLoading] = useState(false);
  const [nodePageData, setNodePageData] = useState<PaginatedSamples | null>(null);
  const [playbackRowSnapshot, setPlaybackRowSnapshot] = useState<
    MediaSample | MembraneCatalogSample | null
  >(null);
  const { toast, dismiss, showError, showSuccess } = useCabinetToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMembraneMe();
      const id = me.membrane.id;
      setMembraneId(id);
      const nodesData = await fetchMembraneNodes(id);
      setNodes(nodesData.nodes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const collectionPageKey = useMemo(() => {
    if (selection.kind === 'catalog') return 'catalog';
    if (selection.kind === 'node') {
      return `node:${selection.deviceId}:${selection.collectionId}`;
    }
    return null;
  }, [selection]);

  const samplesPage = collectionPageKey ? (samplesPageByKey[collectionPageKey] ?? 1) : 1;

  const setSamplesPage = useCallback(
    (page: number) => {
      if (!collectionPageKey) return;
      setSamplesPageByKey((prev) => ({ ...prev, [collectionPageKey]: page }));
    },
    [collectionPageKey],
  );

  useEffect(() => {
    if (!membraneId || selection.kind !== 'catalog') return;
    let cancelled = false;
    setSamplesPageLoading(true);
    void fetchMembraneCatalog(membraneId, samplesPage, DEFAULT_SAMPLES_PAGE_SIZE)
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ошибка загрузки каталога');
        }
      })
      .finally(() => {
        if (!cancelled) setSamplesPageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [membraneId, selection.kind, samplesPage]);

  const activeDeviceId = useMemo(() => {
    if (selection.kind === 'node') return selection.deviceId;
    if (selection.kind === 'catalog' && catalog?.sourceDeviceId) {
      return catalog.sourceDeviceId;
    }
    return null;
  }, [catalog?.sourceDeviceId, selection]);

  const activeNodeLabel = useMemo(() => {
    if (selection.kind === 'node') return selection.label;
    if (selection.kind === 'node-offline') return selection.label;
    return undefined;
  }, [selection]);

  const { snapshot, service, loading: libLoading, loadError, active, refresh } =
    useCabinetMediaLibrary(activeDeviceId, mediaReloadNonce);

  const playback = useSamplePlayback();

  useEffect(() => {
    if (selection.kind !== 'node' || !service || !active) {
      setNodePageData(null);
      return;
    }
    const collectionId = selection.collectionId;
    let cancelled = false;
    setSamplesPageLoading(true);
    void service
      .listSamplesPage(collectionId, samplesPage, DEFAULT_SAMPLES_PAGE_SIZE)
      .then((data) => {
        if (!cancelled) setNodePageData(data);
      })
      .catch((e) => {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : String(e);
          showError(`Загрузка страницы: ${msg}`);
        }
      })
      .finally(() => {
        if (!cancelled) setSamplesPageLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, samplesPage, selection, service, showError]);

  useEffect(() => {
    if (!playback.selectedSampleId) {
      setPlaybackRowSnapshot(null);
    }
  }, [playback.selectedSampleId]);

  useEffect(() => {
    if (!active || !service) return;
    bindSamplePlaybackBlobReader((sampleId) => service.getSampleBlob(sampleId));
    return () => {
      void disposeSamplePlayback();
    };
  }, [active, service]);

  const retryMediaLibrary = useCallback(() => {
    invalidateCabinetMediaLibrary();
    setMediaReloadNonce((n) => n + 1);
  }, []);

  const runMediaOp = useCallback(
    async (label: string, op: () => Promise<unknown>, retry?: () => void) => {
      if (!service || !active) {
        showError('Media-server недоступен', retryMediaLibrary);
        return;
      }
      setBusy(true);
      try {
        await runRemoteMutation(label, async () => {
          await op();
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        showError(`${label}: ${msg}`, retry ?? (() => void runMediaOp(label, op, retry)));
      } finally {
        setBusy(false);
      }
    },
    [active, retryMediaLibrary, service, showError],
  );

  const toggleNodeExpanded = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  const selectPairedNode = useCallback((node: MembraneNodeLibrary) => {
    if (!node.deviceId) return;
    setExpandedNodes((prev) => new Set(prev).add(node.id));
    setSelection({
      kind: 'node',
      nodeId: node.id,
      deviceId: node.deviceId,
      label: node.label,
      collectionId: BUFFER_COLLECTION_ID,
    });
  }, []);

  const selectOfflineNode = useCallback((node: MembraneNodeLibrary) => {
    setSelection({ kind: 'node-offline', nodeId: node.id, label: node.label });
  }, []);

  const catalogSamples = useMemo(() => catalog?.samples ?? [], [catalog?.samples]);
  const nodeSamples = useMemo(
    () => (selection.kind === 'node' ? (nodePageData?.items ?? []) : []),
    [nodePageData?.items, selection.kind],
  );

  const reloadSamplesPage = useCallback(async () => {
    if (selection.kind === 'catalog' && membraneId) {
      const data = await fetchMembraneCatalog(
        membraneId,
        samplesPage,
        DEFAULT_SAMPLES_PAGE_SIZE,
      );
      setCatalog(data);
      return;
    }
    if (selection.kind === 'node' && service && active) {
      const data = await service.listSamplesPage(
        selection.collectionId,
        samplesPage,
        DEFAULT_SAMPLES_PAGE_SIZE,
      );
      setNodePageData(data);
    }
  }, [active, membraneId, samplesPage, selection, service]);

  const selectedCollection: Collection | undefined =
    selection.kind === 'node'
      ? snapshot.collections.find((c) => c.id === selection.collectionId)
      : undefined;

  const isCatalogView = selection.kind === 'catalog';
  const isOfflineView = selection.kind === 'node-offline';
  const isNodeView = selection.kind === 'node';
  const catalogPlaybackBlocked = isCatalogView && !catalog?.sourceDeviceId;

  const samplesPagination = useMemo(() => {
    if (isCatalogView && catalog) {
      return {
        page: catalog.page,
        totalPages: catalog.totalPages,
        total: catalog.sampleCount,
        limit: catalog.limit,
      };
    }
    if (isNodeView && nodePageData) {
      return {
        page: nodePageData.page,
        totalPages: nodePageData.totalPages,
        total: nodePageData.total,
        limit: nodePageData.limit,
      };
    }
    return { page: 1, totalPages: 0, total: 0, limit: DEFAULT_SAMPLES_PAGE_SIZE };
  }, [catalog, isCatalogView, isNodeView, nodePageData]);

  const isTariffDataset =
    selectedCollection?.kind === 'system' &&
    selectedCollection.systemKey === TARIFF_DATASET_SYSTEM_KEY;

  const readOnlyCollection = isTariffDataset || selectedCollection?.kind === 'system';
  const quotaBlocked = active ? isQuotaFull(snapshot.quota) : false;
  const canMutate = isNodeView && active && !readOnlyCollection && !busy;
  const canLabelCatalog = isCatalogView && isAdmin && Boolean(membraneId);

  const handlePatchCatalogLabelNotes = useCallback(
    async (sampleId: string, patch: UpdateSampleLabelNotes) => {
      if (!membraneId || !canLabelCatalog) return;
      setLabelSavingId(sampleId);
      setLabelAnnotateError(null);
      try {
        const updated = await patchCatalogSample(membraneId, sampleId, patch);
        setCatalog((prev) =>
          prev
            ? {
                ...prev,
                samples: prev.samples.map((s) => (s.id === sampleId ? updated : s)),
              }
            : prev,
        );
        showSuccess('Разметка сохранена');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLabelAnnotateError(msg);
        showError(`Разметка: ${msg}`, () =>
          void handlePatchCatalogLabelNotes(sampleId, patch),
        );
      } finally {
        setLabelSavingId(null);
      }
    },
    [canLabelCatalog, membraneId, showError, showSuccess],
  );

  const handlePatchNodeLabelNotes = useCallback(
    async (sampleId: string, patch: UpdateSampleLabelNotes) => {
      if (!service || !active || isTariffDataset) return;
      setLabelSavingId(sampleId);
      setLabelAnnotateError(null);
      try {
        const updated = await service.updateSampleLabelNotes(sampleId, patch);
        setNodePageData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((s) => (s.id === sampleId ? updated : s)),
              }
            : prev,
        );
        showSuccess('Разметка сохранена');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLabelAnnotateError(msg);
        showError(`Разметка: ${msg}`, () => void handlePatchNodeLabelNotes(sampleId, patch));
      } finally {
        setLabelSavingId(null);
      }
    },
    [active, isTariffDataset, service, showError, showSuccess],
  );

  const moveTargets = useMemo(
    () =>
      snapshot.collections.filter(
        (c) =>
          isNodeView &&
          selection.kind === 'node' &&
          c.id !== selection.collectionId &&
          c.kind !== 'buffer' &&
          c.kind !== 'system',
      ),
    [isNodeView, selection, snapshot.collections],
  );

  const selectedPlaybackSample = useMemo((): MediaSample | MembraneCatalogSample | null => {
    if (!playback.selectedSampleId) return null;
    if (isNodeView) {
      const onPage = nodeSamples.find((s) => s.id === playback.selectedSampleId);
      if (onPage) return onPage;
      return playbackRowSnapshot?.id === playback.selectedSampleId
        ? playbackRowSnapshot
        : null;
    }
    if (isCatalogView) {
      const onPage = catalogSamples.find((s) => s.id === playback.selectedSampleId);
      if (onPage) return onPage;
      return playbackRowSnapshot?.id === playback.selectedSampleId
        ? playbackRowSnapshot
        : null;
    }
    return null;
  }, [
    catalogSamples,
    isCatalogView,
    isNodeView,
    nodeSamples,
    playback.selectedSampleId,
    playbackRowSnapshot,
  ]);

  const playbackDisabled =
    busy || (isCatalogView ? catalogPlaybackBlocked || !active : !active);

  const handleSelectPlaybackSample = useCallback(
    async (row: MembraneCatalogSample | MediaSample, mode: 'catalog' | 'node') => {
      const media =
        mode === 'catalog' ? catalogSampleToMedia(row as MembraneCatalogSample) : (row as MediaSample);
      setPlaybackRowSnapshot(row);
      await selectSample(media);
    },
    [],
  );

  const handleTogglePlayback = useCallback(
    async (row: MembraneCatalogSample | MediaSample, mode: 'catalog' | 'node') => {
      const id = row.id;
      if (playback.selectedSampleId !== id) {
        await handleSelectPlaybackSample(row, mode);
      }
      await togglePlayPause();
    },
    [handleSelectPlaybackSample, playback.selectedSampleId],
  );

  const handleExportSelected = useCallback(async () => {
    if (!selectedPlaybackSample || !service) return;
    await runMediaOp('Экспорт', async () => {
      const blob = await service.getSampleBlob(selectedPlaybackSample.id);
      const ext = extensionFromMime(blob.type);
      downloadBlob(blob, `${selectedPlaybackSample.title}.${ext}`);
    });
  }, [runMediaOp, selectedPlaybackSample, service]);

  const handleCreateCollection = useCallback(async () => {
    const name = newCollectionName.trim();
    if (!name || selection.kind !== 'node') return;
    await runMediaOp('Создание коллекции', async () => {
      const col = await service!.createUserCollection(name);
      setNewCollectionName('');
      setSelection({ ...selection, collectionId: col.id });
      showSuccess(`Коллекция «${col.name}» создана`);
    });
  }, [newCollectionName, runMediaOp, selection, service, showSuccess]);

  const handleDeleteCollection = useCallback(async () => {
    if (!selectedCollection || selectedCollection.kind !== 'user' || selection.kind !== 'node') {
      return;
    }
    await runMediaOp('Удаление коллекции', async () => {
      await service!.deleteUserCollection(selectedCollection.id);
      setSelection({ ...selection, collectionId: BUFFER_COLLECTION_ID });
      showSuccess('Коллекция удалена');
    });
  }, [runMediaOp, selectedCollection, selection, service, showSuccess]);

  const handleImport = useCallback(
    async (file: File) => {
      if (!selectedCollection || selection.kind !== 'node' || readOnlyCollection) return;
      await runMediaOp('Импорт', async () => {
        await service!.importBlob(selection.collectionId, file, {
          title: file.name,
          class: DEFAULT_IMPORT_CLASS,
          label: 'unlabeled',
          source: 'disk-import',
          durationSec: 0,
          sampleRate: 48000,
        });
        showSuccess(`Импортирован: ${file.name}`);
      });
      await reloadSamplesPage();
    },
    [readOnlyCollection, reloadSamplesPage, runMediaOp, selectedCollection, selection, service, showSuccess],
  );

  const handleRemove = useCallback(
    async (sampleId: string) => {
      if (readOnlyCollection) return;
      await runMediaOp('Удаление сэмпла', async () => {
        await service!.removeSample(sampleId);
        if (playback.selectedSampleId === sampleId) await selectSample(null);
        showSuccess('Сэмпл удалён');
      });
      await reloadSamplesPage();
    },
    [playback.selectedSampleId, readOnlyCollection, reloadSamplesPage, runMediaOp, service, showSuccess],
  );

  const handleMove = useCallback(
    async (sampleId: string, toId: string) => {
      if (!toId || readOnlyCollection) return;
      await runMediaOp('Перенос сэмпла', async () => {
        await service!.moveSample(sampleId, toId);
        showSuccess('Сэмпл перенесён');
      });
      await reloadSamplesPage();
    },
    [readOnlyCollection, reloadSamplesPage, runMediaOp, service, showSuccess],
  );

  const handleClearBuffer = useCallback(async () => {
    if (selection.kind !== 'node') return;
    await runMediaOp('Очистка буфера', async () => {
      await service!.clearBuffer();
      await selectSample(null);
      showSuccess('Буфер очищен');
    });
    await reloadSamplesPage();
  }, [reloadSamplesPage, runMediaOp, selection, service, showSuccess]);

  const handleExport = useCallback(
    async (sample: MediaSample) => {
      await runMediaOp('Экспорт', async () => {
        const blob = await service!.getSampleBlob(sample.id);
        const ext = extensionFromMime(blob.type);
        downloadBlob(blob, `${sample.title}.${ext}`);
      });
    },
    [runMediaOp, service],
  );

  return {
    loading,
    error,
    load,
    membraneId,
    catalog,
    nodes,
    selection,
    setSelection,
    expandedNodes,
    newCollectionName,
    setNewCollectionName,
    busy,
    toast,
    dismiss,
    loadError,
    libLoading,
    snapshot,
    active,
    refresh,
    playback,
    retryMediaLibrary,
    toggleNodeExpanded,
    selectPairedNode,
    selectOfflineNode,
    catalogSamples,
    nodeSamples,
    selectedCollection,
    isCatalogView,
    isOfflineView,
    isNodeView,
    isTariffDataset,
    catalogPlaybackBlocked,
    readOnlyCollection,
    quotaBlocked,
    canMutate,
    moveTargets,
    selectedPlaybackSample,
    playbackDisabled,
    activeNodeLabel,
    handleSelectPlaybackSample,
    handleTogglePlayback,
    handleExportSelected,
    handleCreateCollection,
    handleDeleteCollection,
    handleImport,
    handleRemove,
    handleMove,
    handleClearBuffer,
    handleExport,
    isAdmin,
    canLabelCatalog,
    labelSavingId,
    labelAnnotateError,
    handlePatchCatalogLabelNotes,
    handlePatchNodeLabelNotes,
    samplesPage,
    setSamplesPage,
    samplesPageLoading,
    samplesPagination,
  };
}

export type CabinetSampleLibraryModel = ReturnType<typeof useCabinetSampleLibrary>;
