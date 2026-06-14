import { BUFFER_COLLECTION_ID } from '@membrana/media-library-service';

import { MediaLibraryQuotaBanner } from '@/components/MediaLibraryQuotaBanner';
import { CabinetSampleCollectionBody } from '@/components/sample-library/CabinetSampleCollectionBody';
import type { CabinetSampleLibraryModel } from '@/lib/useCabinetSampleLibrary';

export type SampleLibraryMainPanelProps = Pick<
  CabinetSampleLibraryModel,
  | 'selection'
  | 'catalog'
  | 'isOfflineView'
  | 'isCatalogView'
  | 'catalogPlaybackBlocked'
  | 'catalogSamples'
  | 'libLoading'
  | 'playback'
  | 'playbackDisabled'
  | 'selectedPlaybackSample'
  | 'handleSelectPlaybackSample'
  | 'handleTogglePlayback'
  | 'handleExportSelected'
  | 'active'
  | 'activeNodeLabel'
  | 'snapshot'
  | 'selectedCollection'
  | 'readOnlyCollection'
  | 'quotaBlocked'
  | 'canMutate'
  | 'handleImport'
  | 'nodeSamples'
  | 'moveTargets'
  | 'handleRemove'
  | 'handleMove'
  | 'handleExport'
>;

export function SampleLibraryMainPanel({
  selection,
  catalog,
  isOfflineView,
  isCatalogView,
  catalogPlaybackBlocked,
  catalogSamples,
  libLoading,
  playback,
  playbackDisabled,
  selectedPlaybackSample,
  handleSelectPlaybackSample,
  handleTogglePlayback,
  handleExportSelected,
  active,
  activeNodeLabel,
  snapshot,
  selectedCollection,
  readOnlyCollection,
  quotaBlocked,
  canMutate,
  handleImport,
  nodeSamples,
  moveTargets,
  handleRemove,
  handleMove,
  handleExport,
}: SampleLibraryMainPanelProps) {
  if (isOfflineView && selection.kind === 'node-offline') {
    return (
      <section className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="rounded-lg border border-dashed border-base-300 bg-base-200/30 p-8 text-center">
          <p className="text-lg font-medium">Узел «{selection.label}» offline</p>
          <p className="mt-2 text-sm text-base-content/60">
            Данные буфера и пользовательских коллекций находятся на полевом клиенте (Electron или
            сессия браузера). Подключите узел через ключ доступа, чтобы управлять библиотекой
            удалённо.
          </p>
        </div>
      </section>
    );
  }

  if (isCatalogView) {
    return (
      <section className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 text-lg font-semibold">
            <span className="block truncate">Базовый набор</span>
            {catalog ? (
              <span className="block truncate font-mono text-sm font-normal text-base-content/60">
                {catalog.catalogId}
              </span>
            ) : null}
          </h2>
          <span className="badge badge-neutral badge-sm shrink-0">системный датасет</span>
          <span className="ml-auto shrink-0 text-sm text-base-content/60">Только чтение</span>
        </div>
        {catalogPlaybackBlocked ? (
          <div className="alert alert-warning text-sm">
            Нет связанного узла — метаданные доступны, воспроизведение появится после pairing.
          </div>
        ) : null}
        <CabinetSampleCollectionBody
          libLoading={libLoading}
          playback={playback}
          playbackDisabled={playbackDisabled}
          selectedSample={selectedPlaybackSample}
          rows={catalogSamples}
          mode="catalog"
          onSelectRow={(row) => void handleSelectPlaybackSample(row, 'catalog')}
          onTogglePlay={(row) => void handleTogglePlayback(row, 'catalog')}
          onExportSelected={
            selectedPlaybackSample && active ? () => void handleExportSelected() : undefined
          }
        />
      </section>
    );
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-3">
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
              quotaBlocked || !canMutate ? 'btn-disabled pointer-events-none opacity-50' : ''
            }`}
            title={
              quotaBlocked ? 'Квота исчерпана — удалите сэмплы или освободите место' : undefined
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
      <CabinetSampleCollectionBody
        libLoading={libLoading}
        playback={playback}
        playbackDisabled={playbackDisabled}
        selectedSample={selectedPlaybackSample}
        rows={nodeSamples}
        mode="node"
        onSelectRow={(row) => void handleSelectPlaybackSample(row, 'node')}
        onTogglePlay={(row) => void handleTogglePlayback(row, 'node')}
        onExportSelected={
          selectedPlaybackSample && active ? () => void handleExportSelected() : undefined
        }
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
    </section>
  );
}
