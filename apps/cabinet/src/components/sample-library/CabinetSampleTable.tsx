import { Fragment } from 'react';
import {
  SampleLabelEditor,
  SampleNotesEditor,
} from '@/components/sample-library/SampleLabelNotesEditor';
import { formatBytes } from '@/lib/formatBytes';
import type { SamplePlaybackSnapshot } from '@membrana/sample-playback-service';
import type { MembraneCatalogSample } from '@/api/sampleLibrary';
import type { Collection, MediaSample, UpdateSampleLabelNotes } from '@membrana/media-library-service';

export interface CabinetSampleTableProps {
  readonly rows: MembraneCatalogSample[] | MediaSample[];
  readonly playback: SamplePlaybackSnapshot;
  readonly playbackDisabled: boolean;
  readonly onSelectRow: (row: MembraneCatalogSample | MediaSample) => void;
  readonly onTogglePlay: (row: MembraneCatalogSample | MediaSample) => void;
  readonly mode: 'catalog' | 'node';
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
}

export function CabinetSampleTable({
  rows,
  playback,
  playbackDisabled,
  onSelectRow,
  onTogglePlay,
  mode,
  readOnly = true,
  canMutate = false,
  showMoveFromBuffer = false,
  moveTargets = [],
  onRemove,
  onMove,
  onExport,
  canLabelAnnotate = false,
  labelSavingId = null,
  labelAnnotateError = null,
  onSaveLabelNotes,
}: CabinetSampleTableProps) {
  const colSpan = mode === 'node' ? 6 : 5;
  const playingId = playback.selectedSampleId;
  const playbackStatus = playback.status;

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
              const isSelected = playingId === id;
              const isPlaying = isSelected && playbackStatus === 'playing';
              const isLoading = isSelected && playbackStatus === 'loading';
              const source = mode === 'node' ? (row as MediaSample).source : undefined;
              const sample = mode === 'node' ? (row as MediaSample) : null;
              const rowNotes = 'notes' in row ? row.notes : undefined;
              const saving = labelSavingId === id;
              const saveError = saving ? labelAnnotateError : null;

              return (
                <Fragment key={id}>
                  <tr
                    className={`cursor-pointer ${isSelected ? 'bg-primary/10' : undefined}`}
                    onClick={() => onSelectRow(row)}
                  >
                    <td className="max-w-[18rem] align-top">
                      <p className="truncate font-medium">{row.title}</p>
                    </td>
                    <td>{row.class}</td>
                    <td className="align-top">
                      <SampleLabelEditor
                        sampleId={id}
                        label={row.label}
                        editable={canLabelAnnotate}
                        saving={saving}
                        error={saveError}
                        onSave={onSaveLabelNotes ?? (() => undefined)}
                      />
                    </td>
                    {mode === 'node' ? <td>{source}</td> : null}
                    <td className="text-right tabular-nums">{formatBytes(row.sizeBytes)}</td>
                    <td>
                      <div className="flex flex-wrap justify-end gap-1">
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          disabled={playbackDisabled}
                          aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePlay(row);
                          }}
                        >
                          {isLoading ? '…' : isPlaying ? '⏸' : '▶'}
                        </button>
                        {mode === 'node' && sample && onExport ? (
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost"
                            disabled={playbackDisabled}
                            aria-label="Экспорт"
                            onClick={(e) => {
                              e.stopPropagation();
                              onExport(sample);
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemove(id);
                            }}
                          >
                            Удалить
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  {isSelected && (canLabelAnnotate || rowNotes) ? (
                    <tr className="bg-primary/10">
                      <td colSpan={colSpan} className="pt-0">
                        <div
                          className="flex flex-col gap-3 py-2"
                          role="region"
                          aria-label="Заметки к выбранному сэмплу"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          {canLabelAnnotate && onSaveLabelNotes ? (
                            <SampleNotesEditor
                              sampleId={id}
                              notes={rowNotes}
                              editable
                              saving={saving}
                              error={saveError}
                              onSave={onSaveLabelNotes}
                            />
                          ) : rowNotes ? (
                            <SampleNotesEditor
                              sampleId={id}
                              notes={rowNotes}
                              editable={false}
                              onSave={() => undefined}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
