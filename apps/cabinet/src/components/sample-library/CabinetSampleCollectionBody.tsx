import { useMemo, useState } from 'react';

import type { MembraneCatalogSample } from '@/api/sampleLibrary';
import { CabinetSamplePlayerSection } from '@/components/sample-library/CabinetSamplePlayerSection';
import { CabinetSampleTable } from '@/components/sample-library/CabinetSampleTable';
import { CabinetSampleTablePagination } from '@/components/sample-library/CabinetSampleTablePagination';
import type { SamplePlaybackSnapshot } from '@membrana/sample-playback-service';
import type { Collection, MediaSample, UpdateSampleLabelNotes } from '@membrana/media-library-service';

/** VDR-HG1: фильтр статуса разметки (toggle в toolbar, консилиум 2026-07-03 D5). */
type LabelFilter = 'all' | 'drone' | 'not-drone' | 'unlabeled';

const LABEL_FILTERS: readonly { value: LabelFilter; title: string }[] = [
  { value: 'all', title: 'Все' },
  { value: 'drone', title: 'Дрон' },
  { value: 'not-drone', title: 'Не дрон' },
  { value: 'unlabeled', title: 'Не размечено' },
];

function rowLabel(row: MembraneCatalogSample | MediaSample): string {
  return (row as { label?: string | null }).label ?? 'unlabeled';
}

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
  const [labelFilter, setLabelFilter] = useState<LabelFilter>('all');

  // VDR-HG1: счётчик прогресса разметки и фильтр — по текущей странице
  // (пилотный корпус 30–35 умещается в одну страницу целиком).
  const labelStats = useMemo(() => {
    const all = rows as Array<MembraneCatalogSample | MediaSample>;
    const unlabeled = all.filter((row) => rowLabel(row) === 'unlabeled').length;
    return { total: all.length, labeled: all.length - unlabeled };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (labelFilter === 'all') return rows;
    const all = rows as Array<MembraneCatalogSample | MediaSample>;
    return all.filter((row) => rowLabel(row) === labelFilter) as typeof rows;
  }, [labelFilter, rows]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <CabinetSamplePlayerSection
        playback={playback}
        selectedSample={selectedSample}
        onExport={onExportSelected}
      />
      {canLabelAnnotate ? (
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="join"
            role="group"
            aria-label="Фильтр по статусу разметки"
          >
            {LABEL_FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`btn btn-xs join-item ${labelFilter === option.value ? 'btn-active' : 'btn-ghost'}`}
                aria-pressed={labelFilter === option.value}
                onClick={() => setLabelFilter(option.value)}
              >
                {option.title}
              </button>
            ))}
          </div>
          <span
            className="text-xs text-base-content/60"
            role="status"
            aria-live="polite"
            title="Прогресс разметки текущей страницы (протокол: DATASET_CURATION.md)"
          >
            Размечено на странице: {labelStats.labeled}/{labelStats.total}
          </span>
        </div>
      ) : null}
      {tableLoading ? (
        <span className="loading loading-spinner loading-sm" aria-label="Загрузка медиа" />
      ) : null}
      <CabinetSampleTable
        rows={filteredRows}
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
