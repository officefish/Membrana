import { CabinetToast } from '@/components/CabinetToast';
import { SampleLibraryMainPanel } from '@/components/sample-library/SampleLibraryMainPanel';
import { SampleLibrarySidebar } from '@/components/sample-library/SampleLibrarySidebar';
import { useCabinetSampleLibrary } from '@/lib/useCabinetSampleLibrary';

export function SampleLibraryPage() {
  const lib = useCabinetSampleLibrary();

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

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
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
          nodeSamples={lib.nodeSamples}
          handleCreateCollection={lib.handleCreateCollection}
          handleDeleteCollection={lib.handleDeleteCollection}
          handleClearBuffer={lib.handleClearBuffer}
        />
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
          handleRemove={lib.handleRemove}
          handleMove={lib.handleMove}
          handleExport={lib.handleExport}
        />
      </div>

      {lib.membraneId ? (
        <p className="text-xs font-mono text-base-content/40">membrane: {lib.membraneId}</p>
      ) : null}
    </div>
  );
}
