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
 * ОТБОР ИДЁТ ПО ВСЕЙ ХРОНИКЕ, а показывается на фоне ЗАГРУЖЕННОЙ ленты (Т1). Поэтому строка
 * выборки может не найти своей карточки: отобрано по всему журналу, а на странице — текущая
 * страница с фильтром. Это не рассинхрон, а разные множества по построению.
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
  compositionLine,
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
          aria-describedby={!canGenerate && !state.busy ? 'chart-list-why-disabled' : undefined}
          onClick={onGenerate}
        >
          {state.busy ? 'Собираем выборку по всему журналу…' : 'Сгенерировать выборку'}
        </button>
        {!canGenerate && !state.busy ? (
          // Кнопка без материала — мёртвый регулятор. Причина названа словами и связана с кнопкой.
          <span id="chart-list-why-disabled" className="text-xs text-base-content/50">
            Устройство не выбрано — отбирать не из чего.
          </span>
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
          {/* Смена выборки объявляется вслух: список меняется целиком, и молчаливая подмена
              содержимого — то же, что подменить ответ на другой вопрос. */}
          <p className="text-xs text-base-content/60" role="status" aria-live="polite">
            {compositionLine(state.selection, state.breakdown)}
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
                  <span>пик {pick.peakDb.toFixed(1)} dBFS</span>
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
              // Счётчик страниц внутри нулевой, человеку показывается с единицы: у журнала
              // рядом «Стр. 1 из 27», и «Стр. 0 из 10» читалось как сбой.
              page={state.page + 1}
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
