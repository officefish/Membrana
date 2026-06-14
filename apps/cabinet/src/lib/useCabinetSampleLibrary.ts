import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUFFER_COLLECTION_ID,
  TARIFF_DATASET_SYSTEM_KEY,
  isQuotaFull,
  type Collection,
  type MediaSample,
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
  type MembraneCatalog,
  type MembraneCatalogSample,
  type MembraneNodeLibrary,
} from '@/api/sampleLibrary';
import { fetchMembraneMe } from '@/api/membrane';
import { catalogSampleToMedia } from '@/lib/catalogSampleAdapter';
import {
  DEFAULT_IMPORT_CLASS,
  type LibrarySelection,
} from '@/lib/cabinetSampleLibraryTypes';
import { invalidateCabinetMediaLibrary } from '@/lib/cabinetMediaLibrary';
import { downloadBlob, extensionFromMime } from '@/lib/downloadBlob';
import { useCabinetMediaLibrary } from '@/lib/useCabinetMediaLibrary';
import { useCabinetToast } from '@/lib/useCabinetToast';

export type { LibrarySelection };

export function useCabinetSampleLibrary() {
  useSamplePlaybackEscapeKey();

  const [membraneId, setMembraneId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<MembraneCatalog | null>(null);
  const [nodes, setNodes] = useState<MembraneNodeLibrary[]>([]);
  const [selection, setSelection] = useState<LibrarySelection>({ kind: 'catalog' });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [newCollectionName, setNewCollectionName] = useState('');
  const [mediaReloadNonce, setMediaReloadNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast, dismiss, showError, showSuccess } = useCabinetToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetchMembraneMe();
      const id = me.membrane.id;
      setMembraneId(id);
      const [catalogData, nodesData] = await Promise.all([
        fetchMembraneCatalog(id),
        fetchMembraneNodes(id),
      ]);
      setCatalog(catalogData);
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
        await op();
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
    () =>
      selection.kind === 'node'
        ? (snapshot.samplesByCollection[selection.collectionId] ?? [])
        : [],
    [selection, snapshot.samplesByCollection],
  );

  const selectedCollection: Collection | undefined =
    selection.kind === 'node'
      ? snapshot.collections.find((c) => c.id === selection.collectionId)
      : undefined;

  const isCatalogView = selection.kind === 'catalog';
  const isOfflineView = selection.kind === 'node-offline';
  const isNodeView = selection.kind === 'node';
  const catalogPlaybackBlocked = isCatalogView && !catalog?.sourceDeviceId;

  const isTariffDataset =
    selectedCollection?.kind === 'system' &&
    selectedCollection.systemKey === TARIFF_DATASET_SYSTEM_KEY;

  const readOnlyCollection = isTariffDataset || selectedCollection?.kind === 'system';
  const quotaBlocked = active ? isQuotaFull(snapshot.quota) : false;
  const canMutate = isNodeView && active && !readOnlyCollection && !busy;

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
      return nodeSamples.find((s) => s.id === playback.selectedSampleId) ?? null;
    }
    if (isCatalogView) {
      return catalogSamples.find((s) => s.id === playback.selectedSampleId) ?? null;
    }
    return null;
  }, [catalogSamples, isCatalogView, isNodeView, nodeSamples, playback.selectedSampleId]);

  const playbackDisabled =
    busy || (isCatalogView ? catalogPlaybackBlocked || !active : !active);

  const handleSelectPlaybackSample = useCallback(
    async (row: MembraneCatalogSample | MediaSample, mode: 'catalog' | 'node') => {
      const media =
        mode === 'catalog' ? catalogSampleToMedia(row as MembraneCatalogSample) : (row as MediaSample);
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
    },
    [readOnlyCollection, runMediaOp, selectedCollection, selection, service, showSuccess],
  );

  const handleRemove = useCallback(
    async (sampleId: string) => {
      if (readOnlyCollection) return;
      await runMediaOp('Удаление сэмпла', async () => {
        await service!.removeSample(sampleId);
        if (playback.selectedSampleId === sampleId) await selectSample(null);
        showSuccess('Сэмпл удалён');
      });
    },
    [playback.selectedSampleId, readOnlyCollection, runMediaOp, service, showSuccess],
  );

  const handleMove = useCallback(
    async (sampleId: string, toId: string) => {
      if (!toId || readOnlyCollection) return;
      await runMediaOp('Перенос сэмпла', async () => {
        await service!.moveSample(sampleId, toId);
        showSuccess('Сэмпл перенесён');
      });
    },
    [readOnlyCollection, runMediaOp, service, showSuccess],
  );

  const handleClearBuffer = useCallback(async () => {
    if (selection.kind !== 'node') return;
    await runMediaOp('Очистка буфера', async () => {
      await service!.clearBuffer();
      await selectSample(null);
      showSuccess('Буфер очищен');
    });
  }, [runMediaOp, selection, service, showSuccess]);

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
  };
}

export type CabinetSampleLibraryModel = ReturnType<typeof useCabinetSampleLibrary>;
