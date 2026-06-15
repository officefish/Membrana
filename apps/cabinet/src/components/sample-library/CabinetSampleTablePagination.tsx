export interface CabinetSampleTablePaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly total: number;
  readonly limit: number;
  readonly loading?: boolean;
  readonly onPageChange: (page: number) => void;
}

/** Prev/next controls under the sample table (40 rows per server page). */
export function CabinetSampleTablePagination({
  page,
  totalPages,
  total,
  limit,
  loading = false,
  onPageChange,
}: CabinetSampleTablePaginationProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

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
          disabled={page <= 1 || loading}
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
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Вперёд
        </button>
      </div>
    </nav>
  );
}
