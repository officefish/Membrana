/**
 * Виджет чарт-листа: кнопка сборки и список отобранного. Блок c6b.
 *
 * РИСУЕТСЯ ПОД ОСНОВНЫМ БЛОКОМ — этим занимается механизм почвы, здесь об этом заботиться не надо.
 * Настроек тут НЕТ: они в сайдбаре (канон §3), и дублировать их сюда запрещено.
 *
 * СТРОКА — ТА ЖЕ, ЧТО В ЖУРНАЛЕ, буквально: `CabinetLiveJournalItemRow`, тот же обработчик
 * проигрывания, тот же waveform. Слово владельца: «то же проигрывание, тот же waveform».
 * Измеренное приезжает из выборки и рисуется НАД карточкой — оно объясняет, почему запись сюда
 * попала, и в саму карточку журнала не лезет: журнал остаётся хроникой факта.
 *
 * ЗАПИСЬ, ВЫПАВШАЯ ИЗ ЗАГРУЖЕННОЙ ЛЕНТЫ, НЕ ПРОПАДАЕТ. У неё показывается измеренное и честная
 * строка «записи нет на загруженной странице». Молча укоротить список значило бы соврать о числе
 * отобранного.
 */
import type { LiveJournalItem } from '@membrana/telemetry-journal-service';

import { CabinetLiveJournalItemRow } from '@/components/journal/CabinetLiveJournalItemRow';
import { LiveJournalPager } from '@/components/journal/LiveJournalPager';

import {
  CHART_LIST_PAGE_SIZE,
  formatDeltaDb,
  joinWithItems,
  pageCount,
  pagePicks,
  structureLabel,
  type ChartListState,
} from './chartList';

export interface ChartListWidgetProps {
  readonly state: ChartListState;
  readonly items: readonly LiveJournalItem[];
  readonly canGenerate: boolean;
  readonly onGenerate: () => void;
  readonly onPage: (page: number) => void;
  readonly onPlay: (item: LiveJournalItem) => Promise<void>;
  readonly onExportBlob: (item: LiveJournalItem) => Promise<Blob>;
}

export function ChartListWidget({
  state,
  items,
  canGenerate,
  onGenerate,
  onPage,
  onPlay,
  onExportBlob,
}: ChartListWidgetProps) {
  const rows = joinWithItems(pagePicks(state), items);
  const total = pageCount(state);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={state.busy || !canGenerate}
          onClick={onGenerate}
        >
          {state.busy ? 'Собираем выборку…' : 'Сгенерировать выборку'}
        </button>
        {!canGenerate && !state.busy ? (
          // Кнопка без материала — мёртвый регулятор. Причина названа словами, а не пустотой.
          <span className="text-xs text-base-content/50">В ленте нет записей для отбора.</span>
        ) : null}
      </div>

      {state.refusal ? (
        <p className="text-sm text-warning" role="status">
          Выборка не собрана: {refusalWords(state.refusal)}
        </p>
      ) : null}
      {state.error ? (
        <p className="text-sm text-error" role="status">
          Не удалось собрать выборку: {state.error}
        </p>
      ) : null}

      {state.selection ? (
        <>
          <p className="text-xs text-base-content/60">
            Отобрано {state.selection.picks.length} из {state.selection.measured} измеренных
            {state.selection.asked > state.selection.measured
              ? ` (запрошено ${state.selection.asked}, у остальных звука нет)`
              : ''}
            {state.selection.shortfall > 0 ? `; не хватило ${state.selection.shortfall} до заказанного объёма` : ''}
          </p>

          <ul className="space-y-3">
            {rows.map(({ pick, item }) => (
              <li key={pick.entryId}>
                <div className="mb-1 flex flex-wrap items-baseline gap-2 text-xs text-base-content/60">
                  <span className="font-semibold text-base-content/80">#{pick.rank}</span>
                  <span>{formatDeltaDb(pick.deltaDb)}</span>
                  <span>
                    {structureLabel(pick.structure)} ({pick.flatness.toFixed(3)})
                  </span>
                  <span>пик {pick.peakDb.toFixed(1)} дБ</span>
                  {pick.displaced > 0 ? <span>вытеснил похожих: {pick.displaced}</span> : null}
                </div>
                {item ? (
                  <CabinetLiveJournalItemRow
                    item={item}
                    linkedReportCount={0}
                    onPlay={() => onPlay(item)}
                    onExportBlob={() => onExportBlob(item)}
                  />
                ) : (
                  <p className="text-xs text-base-content/45">
                    Записи нет на загруженной странице журнала — измеренное показано, карточка не найдена.
                  </p>
                )}
              </li>
            ))}
          </ul>

          {total > 1 ? (
            <LiveJournalPager
              page={state.page}
              totalPages={total}
              pageSize={CHART_LIST_PAGE_SIZE}
              shownCount={rows.length}
              onPrev={() => onPage(state.page - 1)}
              onNext={() => onPage(state.page + 1)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

/** Причины сервера — словами. Незнакомую показываем как есть: выдумывать перевод хуже, чем не знать. */
function refusalWords(reason: string): string {
  switch (reason) {
    case 'empty-task':
      return 'в задании не оказалось записей';
    case 'entry-not-found':
      return 'часть записей не найдена в ленте';
    case 'audio-not-here':
      return 'у журнала нет звука для этих записей';
    case 'floor-not-measured':
      return 'фон не измерен — материала слишком мало';
    case 'no-candidates':
      return 'ни одна запись не прошла порог над фоном';
    case 'unknown-criterion':
      return 'критерий не распознан';
    case 'unknown-volume':
      return 'объём не распознан';
    case 'no-result':
      return 'отбор не вернул выборку';
    default:
      return reason;
  }
}
