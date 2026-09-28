/**
 * ТАБЛИЦА ПРОБ библиотеки Studio (#2501) — вынута из `SampleLibraryModule` без переписывания:
 * разметка, слова и порядок кнопок те же, что были в модуле.
 *
 * Зачем отдельным носителем. Таблица — самая дорогая часть дома: на живом приборе в буфере 1057
 * проб, и каждая строка несла шесть ячеек, четыре органа и `<select>` переноса со списком наборов.
 * Пока эти полторы сотни строк JSX жили внутри модуля, цену отрисовки НЕЛЬЗЯ БЫЛО ЗАМЕРИТЬ: чтобы
 * отрисовать таблицу, приходилось поднимать весь модуль со стором, сервисом и плагинами. Своим
 * носителем таблица стала измеримой — `sample-library-render-cost.test.tsx` рисует её на 1057
 * записях и на одной странице и называет ЧИСЛА, а не рассуждение.
 *
 * Таблица ничего не знает о страницах: ей дают ровно те строки, которые надо показать. Номер
 * страницы, приведение его к живому диапазону и оба числа («на экране» / «всего») живут выше —
 * `lib/samplePage.ts` и органы `SampleLibraryPagination`.
 */
import { Fragment } from 'react';

import type { SamplePlaybackSnapshot } from '@membrana/sample-playback-service';
import type { Collection, MediaSample, UpdateSampleLabelNotes } from '@membrana/media-library-service';

import { SampleLabelEditor, SampleNotesEditor } from './SampleLabelNotesEditor';

export type SampleLabelSaveState = {
  readonly state: 'idle' | 'saving' | 'saved' | 'error';
  readonly detail?: string;
};

export interface SampleLibraryTableProps {
  /** Строки ТЕКУЩЕЙ страницы — не весь набор (иначе смысл листания теряется). */
  readonly rows: readonly MediaSample[];
  /** Что сказать, когда показывать нечего: причина у пустоты разная, и молчание здесь врёт. */
  readonly emptyText: string;
  readonly playback: SamplePlaybackSnapshot;
  readonly labelStates: Record<string, SampleLabelSaveState>;
  readonly canLabelAnnotate: boolean;
  readonly canMoveFrom: boolean;
  readonly moveTargets: readonly Collection[];
  readonly isTariffDataset: boolean;
  readonly onSelectSample: (sample: MediaSample) => void;
  readonly onTogglePlay: (sample: MediaSample) => void;
  readonly onExportSample: (sample: MediaSample) => void;
  readonly onMove: (sampleId: string, toCollectionId: string) => void;
  readonly onRemove: (sampleId: string) => void;
  readonly onSaveLabelNotes: (sampleId: string, patch: UpdateSampleLabelNotes) => void;
}

export function SampleLibraryTable({
  rows,
  emptyText,
  playback,
  labelStates,
  canLabelAnnotate,
  canMoveFrom,
  moveTargets,
  isTariffDataset,
  onSelectSample,
  onTogglePlay,
  onExportSample,
  onMove,
  onRemove,
  onSaveLabelNotes,
}: SampleLibraryTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-base-300">
      <table className="table table-sm">
        <thead>
          <tr>
            <th>Название</th>
            <th>class</th>
            <th>label</th>
            <th>источник</th>
            <th className="text-right">размер</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-base-content/50">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((s: MediaSample) => {
              const isSelected = playback.selectedSampleId === s.id;
              const labelState = labelStates[s.id] ?? { state: 'idle' as const };
              const saving = labelState.state === 'saving';
              return (
                <Fragment key={s.id}>
                  <tr
                    className={isSelected ? 'bg-primary/10' : undefined}
                    onClick={() => onSelectSample(s)}
                  >
                    <td className="max-w-[12rem] align-top">
                      <p className="truncate cursor-pointer font-medium">{s.title}</p>
                    </td>
                    <td>{s.class}</td>
                    <td className="align-top">
                      <SampleLabelEditor
                        sampleId={s.id}
                        label={s.label}
                        editable={canLabelAnnotate}
                        saving={saving}
                        onSave={onSaveLabelNotes}
                      />
                      {labelState.state === 'saved' ? (
                        <span className="text-xs text-success" role="status">сохранено</span>
                      ) : null}
                      {labelState.state === 'error' ? (
                        <span className="text-xs text-error" role="alert" title={labelState.detail}>
                          не сохранилось: {labelState.detail}
                        </span>
                      ) : null}
                    </td>
                    <td>{s.source}</td>
                    <td className="text-right tabular-nums">
                      {(s.sizeBytes / 1024).toFixed(0)} KB
                    </td>
                    <td className="flex flex-wrap justify-end gap-1">
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        aria-label={
                          playback.selectedSampleId === s.id && playback.status === 'playing'
                            ? 'Пауза'
                            : 'Воспроизвести'
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePlay(s);
                        }}
                      >
                        {playback.selectedSampleId === s.id && playback.status === 'playing'
                          ? '⏸'
                          : '▶'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost"
                        aria-label="Экспорт"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExportSample(s);
                        }}
                      >
                        ↓
                      </button>
                      {canMoveFrom && moveTargets.length > 0 ? (
                        <select
                          className="select select-bordered select-xs max-w-[8rem]"
                          defaultValue=""
                          onChange={(e) => {
                            onMove(s.id, e.target.value);
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
                      {!isTariffDataset ? (
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost text-error"
                          onClick={() => onRemove(s.id)}
                        >
                          Удалить
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {isSelected && canLabelAnnotate ? (
                    <tr className="bg-primary/10">
                      <td colSpan={6} className="pt-0">
                        <div
                          className="py-2"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <SampleNotesEditor
                            sampleId={s.id}
                            notes={s.notes}
                            editable
                            saving={saving}
                            onSave={onSaveLabelNotes}
                          />
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
