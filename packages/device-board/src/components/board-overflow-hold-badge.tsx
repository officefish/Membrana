import React from 'react';

import type { BoardOverflowHoldView } from './board-overflow-hold.js';

export interface BoardOverflowHoldBadgeProps {
  readonly hold: BoardOverflowHoldView | null;
}

/**
 * Бейдж удержания в шапке доски (M5 (в), T8): тот же факт, что в окне и на плашке микрофона,
 * той же лексикой — заголовок приходит из клиента готовым (`headline`, #2533), слов у пакета нет.
 * Тон — по месту: занято (error) / освобождено, ждёт человека (warning). Клик открывает то же
 * окно того же `overflowId` — не второе.
 */
export const BoardOverflowHoldBadge: React.FC<BoardOverflowHoldBadgeProps> = ({ hold }) => {
  if (hold === null) {
    return null;
  }
  const label = hold.headline;
  const toneClass = hold.tone === 'warning' ? 'badge-warning' : 'badge-error';
  const className = `badge ${toneClass} badge-sm shrink-0 gap-1`;
  if (!hold.onOpenWindow) {
    return (
      <span
        className={className}
        title={hold.title}
        data-overflow-key={hold.overflowKey}
        data-overflow-tone={hold.tone}
        role="status"
      >
        {label}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`${className} cursor-pointer`}
      title={`${hold.title} — открыть окно`}
      data-overflow-key={hold.overflowKey}
      data-overflow-tone={hold.tone}
      aria-label={`${label}. ${hold.remainingText}. Открыть окно оператора`}
      onClick={hold.onOpenWindow}
    >
      {label}
    </button>
  );
};
