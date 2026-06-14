import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BUFFER_COLLECTION_ID,
  TARIFF_DATASET_SYSTEM_KEY,
  isQuotaFull,
  type Collection,
  type MediaSample,
} from '@membrana/media-library-service';

import {
  fetchMembraneCatalog,
  fetchMembraneNodes,
  type MembraneCatalog,
  type MembraneCatalogSample,
  type MembraneNodeLibrary,
} from '@/api/sampleLibrary';
import { fetchMembraneMe } from '@/api/membrane';
import { CabinetToast } from '@/components/CabinetToast';
import { MediaLibraryQuotaBanner } from '@/components/MediaLibraryQuotaBanner';
import { invalidateCabinetMediaLibrary } from '@/lib/cabinetMediaLibrary';
import { downloadBlob, extensionFromMime } from '@/lib/downloadBlob';
import { formatBytes } from '@/lib/formatBytes';
import { useCabinetMediaLibrary } from '@/lib/useCabinetMediaLibrary';
import { useCabinetToast } from '@/lib/useCabinetToast';
import { useSimpleSamplePlayback } from '@/lib/useSimpleSamplePlayback';

const DEFAULT_IMPORT_CLASS = 'unlabeled';

type LibrarySelection =
  | { kind: 'catalog' }
  | { kind: 'node'; nodeId: string; deviceId: string; label: string; collectionId: string }
  | { kind: 'node-offline'; nodeId: string; label: string };

export function SampleLibraryPage() {
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

  const getBlob = useMemo(() => {
    if (!active || !service) return null;
    return (sampleId: string) => service.getSampleBlob(sampleId);
  }, [active, service]);

  const playback = useSimpleSamplePlayback(getBlob);

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

  const toggleNodeExpanded = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const selectPairedNode = (node: MembraneNodeLibrary) => {
    if (!node.deviceId) return;
    setExpandedNodes((prev) => new Set(prev).add(node.id));
    setSelection({
      kind: 'node',
      nodeId: node.id,
      deviceId: node.deviceId,
      label: node.label,
      collectionId: BUFFER_COLLECTION_ID,
    });
  };

  const selectOfflineNode = (node: MembraneNodeLibrary) => {
    setSelection({ kind: 'node-offline', nodeId: node.id, label: node.label });
  };

  const catalogSamples = catalog?.samples ?? [];
  const nodeSamples =
    selection.kind === 'node'
      ? (snapshot.samplesByCollection[selection.collectionId] ?? [])
      : [];

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
        if (playback.selectedSampleId === sampleId) playback.stop();
        showSuccess('Сэмпл удалён');
      });
    },
    [playback, readOnlyCollection, runMediaOp, service, showSuccess],
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
      playback.stop();
      showSuccess('Буфер очищен');
    });
  }, [playback, runMediaOp, selection, service, showSuccess]);

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

  if (loading) {
    return <span className="loading loading-spinner loading-md" aria-label="Загрузка" />;
  }

  if (error) {
    return (
      <div className="alert alert-error max-w-lg">
        <span>{error}</span>
        <button type="button" className="btn btn-sm" onClick={() => void load()}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <CabinetToast toast={toast} onDismiss={dismiss} />

      <div>
        <h1 className="text-2xl font-semibold">Библиотека сэмплов</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Тарифный набор — на мембране; буфер и коллекции — на каждом узле отдельно.
        </p>
      </div>

      {loadError ? (
        <div className="alert alert-error text-sm" role="alert">
          <div className="flex w-full flex-wrap items-center gap-2">
            <span>{loadError}</span>
            <button type="button" className="btn btn-xs btn-outline" onClick={retryMediaLibrary}>
              Повторить
            </button>
            <button type="button" className="btn btn-xs btn-ghost" onClick={() => void refresh()}>
              Обновить
            </button>
          </div>
        </div>
      ) : null}

      {playback.error ? (
        <div className="alert alert-warning text-sm" role="alert">
          <span>{playback.error}</span>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 gap-4">
        <aside className="flex w-60 shrink-0 flex-col gap-3 overflow-y-auto rounded-lg border border-base-300 bg-base-200/40 p-3">
          <div>
            <span className="text-[10px] uppercase tracking-wide text-base-content/50">
              Мембрана
            </span>
            <button
              type="button"
              className={`btn btn-sm mt-1 w-full justify-start truncate ${
                isCatalogView ? 'btn-primary' : 'btn-ghost'
              }`}
              onClick={() => setSelection({ kind: 'catalog' })}
            >
              Базовый набор
              {catalog ? (
                <span className="ml-auto truncate font-mono text-xs opacity-70">
                  {catalog.catalogId}
                </span>
              ) : null}
            </button>
            {catalog ? (
              <p className="mt-1 text-xs tabular-nums text-base-content/50">
                {catalog.sampleCount} сэмплов · только чтение
              </p>
            ) : null}
          </div>

          <div className="divider my-0" />

          <div>
            <span className="text-[10px] uppercase tracking-wide text-base-content/50">Узлы</span>
            {nodes.length === 0 ? (
              <p className="mt-2 text-xs text-base-content/50">
                Нет узлов. Создайте узел в разделе «Узлы и ключи».
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1">
                {nodes.map((node) => {
                  const isExpanded = expandedNodes.has(node.id);
                  const isActiveNode =
                    selection.kind !== 'catalog' && selection.nodeId === node.id;
                  const nodeCollections =
                    isActiveNode && active && selection.kind === 'node'
                      ? snapshot.collections
                      : [];

                  return (
                    <li key={node.id}>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          className={`btn btn-sm min-w-0 flex-1 justify-start ${
                            isActiveNode ? 'btn-primary' : 'btn-ghost'
                          }`}
                          onClick={() => {
                            if (node.paired) selectPairedNode(node);
                            else selectOfflineNode(node);
                          }}
                        >
                          <span className="truncate">{node.label}</span>
                          {!node.paired ? (
                            <span className="badge badge-ghost badge-xs ml-auto">offline</span>
                          ) : null}
                        </button>
                        {node.paired ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs shrink-0 px-2"
                            aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
                            onClick={() => {
                              toggleNodeExpanded(node.id);
                              if (!isExpanded) selectPairedNode(node);
                            }}
                          >
                            {isExpanded ? '▾' : '▸'}
                          </button>
                        ) : null}
                      </div>

                      {node.paired && isExpanded && isActiveNode && active ? (
                        <ul className="ml-2 mt-1 flex flex-col gap-0.5 border-l border-base-content/10 pl-2">
                          {nodeCollections.map((col) => (
                            <li key={col.id}>
                              <button
                                type="button"
                                className={`btn btn-xs w-full justify-start truncate ${
                                  selection.kind === 'node' &&
                                  selection.collectionId === col.id
                                    ? 'btn-outline btn-primary'
                                    : 'btn-ghost'
                                }`}
                                onClick={() => {
                                  if (!node.deviceId) return;
                                  setSelection({
                                    kind: 'node',
                                    nodeId: node.id,
                                    deviceId: node.deviceId,
                                    label: node.label,
                                    collectionId: col.id,
                                  });
                                }}
                              >
                                {col.name}
                                <span className="ml-auto tabular-nums opacity-70">
                                  {(snapshot.samplesByCollection[col.id] ?? []).length}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {isNodeView && active ? (
            <>
              <div className="divider my-0" />
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-base-content/50">
                  Коллекции узла
                </span>
                <input
                  type="text"
                  className="input input-bordered input-xs"
                  placeholder="Новая коллекция"
                  value={newCollectionName}
                  disabled={busy}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-xs btn-outline"
                  disabled={!newCollectionName.trim() || busy}
                  onClick={() => void handleCreateCollection()}
                >
                  Создать
                </button>
                {selectedCollection?.kind === 'user' ? (
                  <button
                    type="button"
                    className="btn btn-xs btn-error btn-outline"
                    disabled={busy}
                    onClick={() => void handleDeleteCollection()}
                  >
                    Удалить коллекцию
                  </button>
                ) : null}
                {selection.kind === 'node' &&
                selection.collectionId === BUFFER_COLLECTION_ID ? (
                  <button
                    type="button"
                    className="btn btn-xs btn-ghost"
                    disabled={busy || nodeSamples.length === 0}
                    onClick={() => void handleClearBuffer()}
                  >
                    Очистить буфер
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-3">
          {isOfflineView ? (
            <div className="rounded-lg border border-dashed border-base-300 bg-base-200/30 p-8 text-center">
              <p className="text-lg font-medium">Узел «{selection.label}» offline</p>
              <p className="mt-2 text-sm text-base-content/60">
                Данные буфера и пользовательских коллекций находятся на полевом клиенте (Electron
                или сессия браузера). Подключите узел через ключ доступа, чтобы управлять
                библиотекой удалённо.
              </p>
            </div>
          ) : isCatalogView ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">
                  Базовый набор {catalog ? `(${catalog.catalogId})` : ''}
                </h2>
                <span className="badge badge-neutral badge-sm">системный датасет</span>
                <span className="ml-auto text-sm text-base-content/60">Только чтение</span>
              </div>
              {catalogPlaybackBlocked ? (
                <div className="alert alert-warning text-sm">
                  Нет связанного узла — метаданные доступны, воспроизведение появится после
                  pairing.
                </div>
              ) : null}
              {libLoading ? (
                <span className="loading loading-spinner loading-sm" aria-label="Загрузка медиа" />
              ) : null}
              <SampleTable
                rows={catalogSamples}
                playingId={playback.selectedSampleId}
                playbackStatus={playback.status}
                playbackDisabled={catalogPlaybackBlocked || !active}
                onTogglePlay={(id) => void playback.toggleSample(id)}
                mode="catalog"
              />
            </>
          ) : (
            <>
              {active ? (
                <MediaLibraryQuotaBanner quota={snapshot.quota} nodeLabel={activeNodeLabel} />
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{selectedCollection?.name ?? '—'}</h2>
                {selectedCollection?.kind === 'system' ? (
                  <span className="badge badge-neutral badge-sm">системный датасет</span>
                ) : null}
                {readOnlyCollection ? (
                  <span className="ml-auto text-sm text-base-content/60">Только чтение</span>
                ) : (
                  <label
                    className={`btn btn-sm btn-primary ml-auto cursor-pointer ${
                      quotaBlocked || !canMutate
                        ? 'btn-disabled pointer-events-none opacity-50'
                        : ''
                    }`}
                    title={
                      quotaBlocked
                        ? 'Квота исчерпана — удалите сэмплы или освободите место'
                        : undefined
                    }
                  >
                    Импорт WAV
                    <input
                      type="file"
                      accept="audio/*,.wav"
                      className="hidden"
                      disabled={quotaBlocked || !canMutate}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleImport(file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
              {libLoading ? (
                <span className="loading loading-spinner loading-sm" aria-label="Загрузка медиа" />
              ) : null}
              <SampleTable
                rows={nodeSamples}
                playingId={playback.selectedSampleId}
                playbackStatus={playback.status}
                playbackDisabled={!active || busy}
                onTogglePlay={(id) => void playback.toggleSample(id)}
                mode="node"
                readOnly={readOnlyCollection}
                canMutate={canMutate}
                showMoveFromBuffer={
                  selection.kind === 'node' &&
                  selection.collectionId === BUFFER_COLLECTION_ID &&
                  moveTargets.length > 0
                }
                moveTargets={moveTargets}
                onRemove={(id) => void handleRemove(id)}
                onMove={(id, toId) => void handleMove(id, toId)}
                onExport={(sample) => void handleExport(sample)}
              />
            </>
          )}
        </section>
      </div>

      {membraneId ? (
        <p className="text-xs font-mono text-base-content/40">membrane: {membraneId}</p>
      ) : null}
    </div>
  );
}

interface SampleTableProps {
  rows: MembraneCatalogSample[] | MediaSample[];
  playingId: string | null;
  playbackStatus: 'idle' | 'loading' | 'playing' | 'error';
  playbackDisabled: boolean;
  onTogglePlay: (id: string) => void;
  mode: 'catalog' | 'node';
  readOnly?: boolean;
  canMutate?: boolean;
  showMoveFromBuffer?: boolean;
  moveTargets?: Collection[];
  onRemove?: (id: string) => void;
  onMove?: (id: string, toId: string) => void;
  onExport?: (sample: MediaSample) => void;
}

function SampleTable({
  rows,
  playingId,
  playbackStatus,
  playbackDisabled,
  onTogglePlay,
  mode,
  readOnly = true,
  canMutate = false,
  showMoveFromBuffer = false,
  moveTargets = [],
  onRemove,
  onMove,
  onExport,
}: SampleTableProps) {
  const colSpan = mode === 'node' ? 6 : 5;

  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Название</th>
            <th>class</th>
            <th>label</th>
            {mode === 'node' ? <th>источник</th> : null}
            <th className="text-right">размер</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="text-center text-base-content/50">
                Нет сэмплов.
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const id = row.id;
              const isPlaying = playingId === id && playbackStatus === 'playing';
              const isLoading = playingId === id && playbackStatus === 'loading';
              const source = mode === 'node' ? (row as MediaSample).source : undefined;
              const sample = mode === 'node' ? (row as MediaSample) : null;

              return (
                <tr key={id} className={playingId === id ? 'bg-primary/10' : undefined}>
                  <td className="max-w-[14rem] truncate">{row.title}</td>
                  <td>{row.class}</td>
                  <td>{row.label}</td>
                  {mode === 'node' ? <td>{source}</td> : null}
                  <td className="text-right tabular-nums">{formatBytes(row.sizeBytes)}</td>
                  <td>
                    <div className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        disabled={playbackDisabled}
                        aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
                        onClick={() => onTogglePlay(id)}
                      >
                        {isLoading ? '…' : isPlaying ? '⏸' : '▶'}
                      </button>
                      {mode === 'node' && sample && onExport ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          disabled={playbackDisabled}
                          aria-label="Экспорт"
                          onClick={() => onExport(sample)}
                        >
                          ↓
                        </button>
                      ) : null}
                      {showMoveFromBuffer && canMutate && onMove ? (
                        <select
                          className="select select-bordered select-xs max-w-[8rem]"
                          defaultValue=""
                          disabled={playbackDisabled}
                          onChange={(e) => {
                            const toId = e.target.value;
                            if (toId) onMove(id, toId);
                            e.target.value = '';
                          }}
                        >
                          <option value="" disabled>
                            Перенести…
                          </option>
                          {moveTargets.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {mode === 'node' && !readOnly && canMutate && onRemove ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost text-error"
                          disabled={playbackDisabled}
                          onClick={() => onRemove(id)}
                        >
                          Удалить
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
