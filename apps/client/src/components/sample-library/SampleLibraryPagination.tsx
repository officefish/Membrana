/**
 * ОРГАНЫ ЛИСТАНИЯ списка проб в Studio (#2505) — близнец кабинетного
 * `CabinetSampleTablePagination`.
 *
 * Слова, разметка и aria-подписи взяты у кабинета НАМЕРЕННО: два дома одной библиотеки не должны
 * говорить о страницах по-разному. Общего носителя у них сегодня нет (React-разметка у каждого
 * приложения своя, нового пакета под один `nav` не заводят — см. отчёт по #2497), поэтому копия
 * связана с оригиналом зубом сходства: разъедутся — покраснеет
 * `sample-library-paging-twins.test.ts`.
 *
 * Показываем И диапазон, И номер страницы: «41–80 из 1057» отвечает на «сколько всего», а
 * «2 / 27» — на «где я». Одно без другого уже приводило к тому, что доля страницы выдавала себя
 * за долю набора (#2237).
 */
export interface SampleLibraryPaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
  readonly from: number;
  readonly to: number;
  readonly onPageChange: (page: number) => void;
}

export function SampleLibraryPagination({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
}: SampleLibraryPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2 border-t border-base-300 pt-3"
      aria-label="Пагинация таблицы сэмплов"
    >
      <span className="text-sm text-base-content/60 tabular-nums">
        {from}–{to} из {total}
      </span>
      <div className="join">
        <button
          type="button"
          className="btn btn-sm join-item"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Назад
        </button>
        <span className="btn btn-sm join-item btn-disabled tabular-nums" aria-current="page">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-sm join-item"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Вперёд
        </button>
      </div>
    </nav>
  );
}
