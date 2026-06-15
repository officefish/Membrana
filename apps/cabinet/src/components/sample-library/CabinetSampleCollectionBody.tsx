import type { MembraneCatalogSample } from '@/api/sampleLibrary';
import { CabinetSamplePlayerSection } from '@/components/sample-library/CabinetSamplePlayerSection';
import { CabinetSampleTable } from '@/components/sample-library/CabinetSampleTable';
import { CabinetSampleTablePagination } from '@/components/sample-library/CabinetSampleTablePagination';
import type { SamplePlaybackSnapshot } from '@membrana/sample-playback-service';
import type { Collection, MediaSample, UpdateSampleLabelNotes } from '@membrana/media-library-service';

export interface CabinetSampleCollectionBodyProps {
  readonly libLoading: boolean;
  readonly playback: SamplePlaybackSnapshot;
  readonly playbackDisabled: boolean;
  readonly selectedSample: MediaSample | MembraneCatalogSample | null;
  readonly rows: MembraneCatalogSample[] | MediaSample[];
  readonly mode: 'catalog' | 'node';
  readonly onSelectRow: (row: MembraneCatalogSample | MediaSample) => void;
  readonly onTogglePlay: (row: MembraneCatalogSample | MediaSample) => void;
  readonly onExportSelected?: () => void;
  readonly readOnly?: boolean;
  readonly canMutate?: boolean;
  readonly showMoveFromBuffer?: boolean;
  readonly moveTargets?: Collection[];
  readonly onRemove?: (id: string) => void;
  readonly onMove?: (id: string, toId: string) => void;
  readonly onExport?: (sample: MediaSample) => void;
  readonly canLabelAnnotate?: boolean;
  readonly labelSavingId?: string | null;
  readonly labelAnnotateError?: string | null;
  readonly onSaveLabelNotes?: (sampleId: string, patch: UpdateSampleLabelNotes) => void;
  readonly samplesPage?: number;
  readonly samplesTotalPages?: number;
  readonly samplesTotal?: number;
  readonly samplesPageSize?: number;
  readonly samplesPageLoading?: boolean;
  readonly onSamplesPageChange?: (page: number) => void;
}

/** Одна колонка: плеер под шапкой коллекции, затем таблица сэмплов. */
export function CabinetSampleCollectionBody({
  libLoading,
  playback,
  playbackDisabled,
  selectedSample,
  rows,
  mode,
  onSelectRow,
  onTogglePlay,
  onExportSelected,
  readOnly,
  canMutate,
  showMoveFromBuffer,
  moveTargets,
  onRemove,
  onMove,
  onExport,
  canLabelAnnotate,
  labelSavingId,
  labelAnnotateError,
  onSaveLabelNotes,
  samplesPage = 1,
  samplesTotalPages = 0,
  samplesTotal = 0,
  samplesPageSize = 40,
  samplesPageLoading = false,
  onSamplesPageChange,
}: CabinetSampleCollectionBodyProps) {
  const tableLoading = libLoading || samplesPageLoading;
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <CabinetSamplePlayerSection
        playback={playback}
        selectedSample={selectedSample}
        onExport={onExportSelected}
      />
      {tableLoading ? (
        <span className="loading loading-spinner loading-sm" aria-label="Загрузка медиа" />
      ) : null}
      <CabinetSampleTable
        rows={rows}
        playback={playback}
        playbackDisabled={playbackDisabled}
        onSelectRow={onSelectRow}
        onTogglePlay={onTogglePlay}
        mode={mode}
        readOnly={readOnly}
        canMutate={canMutate}
        showMoveFromBuffer={showMoveFromBuffer}
        moveTargets={moveTargets}
        onRemove={onRemove}
        onMove={onMove}
        onExport={onExport}
        canLabelAnnotate={canLabelAnnotate}
        labelSavingId={labelSavingId}
        labelAnnotateError={labelAnnotateError}
        onSaveLabelNotes={onSaveLabelNotes}
      />
      {onSamplesPageChange ? (
        <CabinetSampleTablePagination
          page={samplesPage}
          totalPages={samplesTotalPages}
          total={samplesTotal}
          limit={samplesPageSize}
          loading={samplesPageLoading}
          onPageChange={onSamplesPageChange}
        />
      ) : null}
    </div>
  );
}
