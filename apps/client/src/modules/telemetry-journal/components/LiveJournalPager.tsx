import React from 'react';

export interface LiveJournalPagerProps {
  readonly page: number;
  readonly totalPages: number;
  readonly pageSize: number;
  readonly shownCount: number;
  readonly onPrev: () => void;
  readonly onNext: () => void;
}

export const LiveJournalPager: React.FC<LiveJournalPagerProps> = ({
  page,
  totalPages,
  pageSize,
  shownCount,
  onPrev,
  onNext,
}) => {
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-2 pt-2"
      aria-label="Пагинация live-журнала"
    >
      <p className="text-xs text-base-content/60 tabular-nums">
        Стр. {page} из {totalPages} · {shownCount} / {pageSize} на странице
      </p>
      <div className="join">
        <button
          type="button"
          className="btn btn-xs join-item min-h-9"
          disabled={!hasPrev}
          aria-current={hasPrev ? undefined : 'page'}
          onClick={onPrev}
        >
          Назад
        </button>
        <button
          type="button"
          className="btn btn-xs join-item min-h-9"
          disabled={!hasNext}
          aria-current={hasNext ? undefined : 'page'}
          onClick={onNext}
        >
          Вперёд
        </button>
      </div>
    </nav>
  );
};
