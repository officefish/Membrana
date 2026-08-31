import { useCallback, useMemo, useState } from 'react';

import { CabinetToast } from '@/components/CabinetToast';
import { CabinetSampleChartListPanel } from '@/components/sample-library/CabinetSampleChartListPanel';
import { DeletionConfirmDialog } from '@/components/sample-library/DeletionConfirmDialog';
import { CabinetSampleDuplicatesPanel } from '@/components/sample-library/CabinetSampleDuplicatesPanel';
import { CabinetSampleSessionDigestPanel } from '@/components/sample-library/CabinetSampleSessionDigestPanel';
import { CabinetSamplePlayerSection } from '@/components/sample-library/CabinetSamplePlayerSection';
import { BUFFER_COLLECTION_ID, BUFFER_MANAGER_MANIFEST } from '@membrana/media-library-service';
import type { MediaSample } from '@membrana/media-library-service';

import { BufferManagerPanel } from '@/components/buffer-manager/BufferManagerPanel';
import { PagePluginArea } from '@/plugins/PagePluginArea';
import { localPluginSource } from '@/plugins/pagePluginSource';
import { useHomePagePlugins } from '@/plugins/useHomePagePlugins';
import type { CabinetRendererRegistry, HomePluginState } from '@/plugins/adapters/manifestToPagePlugin';
import { SampleLibraryMainPanel } from '@/components/sample-library/SampleLibraryMainPanel';
import { SampleLibrarySidebar } from '@/components/sample-library/SampleLibrarySidebar';
import { useCabinetSampleLibrary } from '@/lib/useCabinetSampleLibrary';

/**
 * Жильцы библиотеки — те же три плагина, что и раньше, но теперь ЖИЛЬЦЫ, а не блоки в потоке.
 *
 * Форма `table` у всех трёх: это перечни строк, и страница умеет их рисовать. Включены сразу —
 * иначе владелец, открыв страницу, увидел бы пустое место там, где вчера была панель.
 */
const LIBRARY_TENANTS: readonly HomePluginState[] = [
  { enabled: true, manifest: { id: 'membrana.showcase.library-chart-list', version: '0.1.0', kind: 'showcase', mountTarget: 'background-media/collections', triggers: [], displayForm: 'table', description: 'Отбор звуков набора по объёму, критерию и промежутку дат' } },
  { enabled: true, manifest: { id: 'membrana.showcase.library-duplicates', version: '0.1.0', kind: 'showcase', mountTarget: 'background-media/collections', triggers: [], displayForm: 'table', description: 'Пары похожих проб набора — показать и ждать слова' } },
  // Манифест берётся у носителя, а не переписывается: ревью #2211 нашло разошедшийся дубль.
  { enabled: true, manifest: BUFFER_MANAGER_MANIFEST },
  { enabled: true, manifest: { id: 'membrana.showcase.library-session-digest', version: '0.1.0', kind: 'showcase', mountTarget: 'background-media/collections', triggers: [], displayForm: 'table', description: 'Двадцать опорных звуков сеанса и негативный материал' } },
];

export function SampleLibraryPage() {
  const lib = useCabinetSampleLibrary();

  /**
   * ВОРОТА УДАЛЕНИЯ (#2218). Обе воронки — построчное удаление и очистка буфера — проходят
   * через одно окно. Дом не спрашивает `window.confirm` нигде: системный вопрос умеет
   * «уверены?» и не умеет ни списка, ни ценности, а именно этого не хватило 28.08.
   */
  const [pending, setPending] = useState<{
    readonly title: string;
    readonly samples: readonly MediaSample[];
    readonly declaredTotal?: number;
    readonly run: () => void | Promise<void>;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const askDelete = useCallback(
    (title: string, samples: readonly MediaSample[], run: () => void | Promise<void>, declaredTotal?: number) => {
      setPending({ title, samples, run, declaredTotal });
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!pending) return;
    setDeleting(true);
    try {
      await pending.run();
    } finally {
      setDeleting(false);
      setPending(null);
    }
  }, [pending]);

  const removeGated = useCallback(
    async (id: string): Promise<void> => {
      const one = lib.nodeSamples.find((s: MediaSample) => s.id === id);
      // Проба может лежать вне загруженной страницы: тогда список пуст, но удаление по id
      // состоится. Объявляем ЧИСЛО — иначе окно решило бы «удалять нечего» и не дало бы
      // подтвердить то, что на деле уйдёт (родня занижения потери, ревью #2232).
      askDelete('Удалить пробу', one ? [one] : [], () => lib.handleRemove(id), 1);
    },
    [askDelete, lib],
  );

  const clearBufferGated = useCallback(async (): Promise<void> => {
    const known = lib.nodeSamples;
    const declared =
      lib.nodeSamplesTotal ||
      (lib.snapshot.collections.find((c: { id: string; sampleCount?: number }) => c.id === BUFFER_COLLECTION_ID)
        ?.sampleCount ??
        known.length);
    askDelete('Очистить буфер', known, () => lib.handleClearBuffer(), declared);
  }, [askDelete, lib]);
  // Источник местный: у media нет входа списка плагинов и переключения (замер 26.08) — см.
  // `pagePluginSource.ts`. Раскладка при этом ЖУРНАЛЬНАЯ, а не вторая своя.
  const source = useMemo(() => localPluginSource(LIBRARY_TENANTS), []);
  const nodeView = lib.selection.kind === 'node' && lib.service && lib.active;
  const collectionId = lib.selection.kind === 'node' ? lib.selection.collectionId : null;

  const libraryRenderers: CabinetRendererRegistry = {
    'membrana.showcase.library-chart-list': {
      name: 'Отбор чарт-листа',
      renderWidget: () =>
        nodeView && collectionId ? (
          <CabinetSampleChartListPanel
            service={lib.service!}
            collectionId={collectionId}
            knownSamples={lib.nodeSamples}
            playback={lib.playback}
            disabled={lib.playbackDisabled}
            moveTargets={lib.moveTargets}
            canMutate={lib.canMutate}
            onMove={(id, toId) => lib.handleMove(id, toId)}
            onExport={(id) => {
              // Скачивание берёт пробу из библиотеки по адресу: у выборки своего блоба нет.
              const s = lib.nodeSamples.find((x: MediaSample) => x.id === id);
              if (s) void lib.handleExport(s);
            }}
            onRemove={removeGated}
          />
        ) : (
          <p className="text-sm text-base-content/60" role="status">
            Выберите набор узла — отбор идёт по нему.
          </p>
        ),
    },
    'membrana.showcase.library-duplicates': {
      name: 'Дубли набора',
      renderWidget: () =>
        nodeView && collectionId ? (
          <CabinetSampleDuplicatesPanel
            service={lib.service!}
            collectionId={collectionId}
            knownSamples={lib.nodeSamples}
            playback={lib.playback}
            disabled={lib.playbackDisabled}
            onRemove={(id) => handleRemoveFromPanel(id)}
          />
        ) : (
          <p className="text-sm text-base-content/60" role="status">
            Выберите набор узла — дубли ищутся в нём.
          </p>
        ),
    },
    'membrana.showcase.library-session-digest': {
      name: 'Разбор сеанса',
      renderWidget: () =>
        nodeView && collectionId ? (
          <CabinetSampleSessionDigestPanel
            service={lib.service!}
            collectionId={collectionId}
            knownSamples={lib.nodeSamples}
            playback={lib.playback}
            disabled={lib.playbackDisabled}
          />
        ) : (
          <p className="text-sm text-base-content/60" role="status">
            Выберите набор узла — разбор идёт по нему.
          </p>
        ),
    },
    [BUFFER_MANAGER_MANIFEST.id]: {
      name: 'Управление буфером',
      renderWidget: () =>
        nodeView && collectionId ? (
          <BufferManagerPanel
            service={lib.service!}
            collectionId={collectionId}
            usedBytes={lib.snapshot.quota.bufferUsedBytes}
            limitBytes={lib.snapshot.quota.bufferLimitBytes}
            disabled={!lib.canMutate}
            onCleaned={() => void lib.load()}
          />
        ) : (
          <p className="text-sm text-base-content/60" role="status">
            Выберите набор узла — буфер живёт на узле.
          </p>
        ),
    },
  };
  const handleRemoveFromPanel = (id: string) => removeGated(id);
  const pagePlugins = useHomePagePlugins(libraryRenderers, source);

  if (lib.loading) {
    return <span className="loading loading-spinner loading-md" aria-label="Загрузка" />;
  }

  if (lib.error) {
    return (
      <div className="alert alert-error max-w-lg">
        <span>{lib.error}</span>
        <button type="button" className="btn btn-sm" onClick={() => void lib.load()}>
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <CabinetToast toast={lib.toast} onDismiss={lib.dismiss} />

      <header>
        <h1 className="text-2xl font-semibold">Библиотека сэмплов</h1>
        <p className="mt-1 text-sm text-base-content/70">
          Тарифный набор — на мембране; буфер и коллекции — на каждом узле отдельно.
        </p>
      </header>

      {lib.loadError ? (
        <div className="alert alert-error text-sm" role="alert">
          <div className="flex w-full flex-wrap items-center gap-2">
            <span>{lib.loadError}</span>
            <button
              type="button"
              className="btn btn-xs btn-outline"
              onClick={lib.retryMediaLibrary}
            >
              Повторить
            </button>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => void lib.refresh()}
            >
              Обновить
            </button>
          </div>
        </div>
      ) : null}

      {lib.playback.errorMessage ? (
        <div className="alert alert-warning text-sm" role="alert">
          <span>{lib.playback.errorMessage}</span>
        </div>
      ) : null}

      <PagePluginArea
        plugins={pagePlugins.plugins}
        state={pagePlugins.state}
        onToggle={pagePlugins.toggle}
        mainHeader={
          /*
            Кнопка сворачивания — В ШАПКЕ, вне сворачиваемого: положи её внутрь, и свёрнутый
            список унёс бы её с собой — развернуть стало бы нечем. Та же причина, что у
            журнала (PagePluginArea.mainHeader), и потому раскладка взята, а не изобретена.
          */
          <div className="space-y-2">
            {/*
              Виджет плеера ОСТАЁТСЯ при свёрнутом списке (#2177, требование 4): «список
              сворачивается, виджет waveform остаётся». В теле он живёт внутри сворачиваемого и
              исчезал вместе с ним — ревью #2184 поймало это раньше владельца. Здесь он рисуется
              ТОЛЬКО в свёрнутом состоянии: в развёрнутом он уже есть внизу, и два плеера разом
              были бы двумя органами одного звука.
            */}
            {pagePlugins.state.mainCollapsed ? (
              <CabinetSamplePlayerSection
                playback={lib.playback}
                selectedSample={lib.selectedPlaybackSample}
                onExport={lib.selectedPlaybackSample && lib.active ? () => void lib.handleExportSelected() : undefined}
              />
            ) : null}
          <div className="flex items-center justify-between">
            <span className="text-sm text-base-content/60">
              {pagePlugins.state.mainCollapsed ? 'Список свёрнут — виджеты плагинов остались' : 'Список наборов и проб'}
            </span>
            <button
              type="button"
              className="btn btn-xs btn-ghost"
              onClick={() => pagePlugins.collapseMain(!pagePlugins.state.mainCollapsed)}
            >
              {pagePlugins.state.mainCollapsed ? 'Развернуть список' : 'Свернуть список'}
            </button>
          </div>
          </div>
        }
        mainAside={
            <SampleLibrarySidebar
              catalog={lib.catalog}
              nodes={lib.nodes}
              selection={lib.selection}
              setSelection={lib.setSelection}
              expandedNodes={lib.expandedNodes}
              toggleNodeExpanded={lib.toggleNodeExpanded}
              selectPairedNode={lib.selectPairedNode}
              selectOfflineNode={lib.selectOfflineNode}
              snapshot={lib.snapshot}
              active={lib.active}
              isNodeView={lib.isNodeView}
              isCatalogView={lib.isCatalogView}
              newCollectionName={lib.newCollectionName}
              setNewCollectionName={lib.setNewCollectionName}
              busy={lib.busy}
              selectedCollection={lib.selectedCollection}
              handleCreateCollection={lib.handleCreateCollection}
              handleDeleteCollection={lib.handleDeleteCollection}
              handleClearBuffer={clearBufferGated}
            />
        }
      >

            <SampleLibraryMainPanel
              selection={lib.selection}
              catalog={lib.catalog}
              isOfflineView={lib.isOfflineView}
              isCatalogView={lib.isCatalogView}
              catalogPlaybackBlocked={lib.catalogPlaybackBlocked}
              catalogSamples={lib.catalogSamples}
              libLoading={lib.libLoading}
              playback={lib.playback}
              playbackDisabled={lib.playbackDisabled}
              selectedPlaybackSample={lib.selectedPlaybackSample}
              handleSelectPlaybackSample={lib.handleSelectPlaybackSample}
              handleTogglePlayback={lib.handleTogglePlayback}
              handleExportSelected={lib.handleExportSelected}
              active={lib.active}
              activeNodeLabel={lib.activeNodeLabel}
              snapshot={lib.snapshot}
              selectedCollection={lib.selectedCollection}
              readOnlyCollection={lib.readOnlyCollection}
              quotaBlocked={lib.quotaBlocked}
              canMutate={lib.canMutate}
              handleImport={lib.handleImport}
              nodeSamples={lib.nodeSamples}
              moveTargets={lib.moveTargets}
              handleRemove={removeGated}
              handleMove={lib.handleMove}
              handleExport={lib.handleExport}
              canLabelCatalog={lib.canLabelCatalog}
                  labelSavingId={lib.labelSavingId}
              labelStates={lib.labelStates}
              labelAnnotateError={lib.labelAnnotateError}
              handlePatchCatalogLabelNotes={lib.handlePatchCatalogLabelNotes}
              handlePatchNodeLabelNotes={lib.handlePatchNodeLabelNotes}
              isTariffDataset={lib.isTariffDataset}
              setSamplesPage={lib.setSamplesPage}
              samplesPageLoading={lib.samplesPageLoading}
              samplesPagination={lib.samplesPagination}
            />
      </PagePluginArea>

      <DeletionConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ''}
        samples={pending?.samples ?? []}
        declaredTotal={pending?.declaredTotal}
        collections={lib.snapshot.collections}
        deviceId={lib.selection.kind === 'node' ? lib.selection.nodeId : undefined}
        busy={deleting}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirmDelete()}
      />

      {lib.membraneId ? (
        <p className="text-xs font-mono text-base-content/40">membrane: {lib.membraneId}</p>
      ) : null}
    </div>
  );
}
