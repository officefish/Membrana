import React from 'react';

import { BOARD_HOLD_BADGE_MIN_WIDTH_CLASS } from '../types/board-ui.js';

import type { BoardOverflowHoldView } from './board-overflow-hold.js';

export interface BoardOverflowHoldBadgeProps {
  readonly hold: BoardOverflowHoldView | null;
}

/**
 * Бейдж удержания в шапке доски (M5 (в), T8): тот же факт, что в окне и на плашке микрофона,
 * той же лексикой — заголовок приходит из клиента готовым (`headline`, #2533), слов у пакета нет.
 * Тон — по месту: занято (error) / освобождено, ждёт человека (warning). Клик открывает то же
 * окно того же `overflowId` — не второе.
 *
 * Место в шапке (#2552): бейдж уступает — сжимается вместо `shrink-0`, текст усекается многоточием
 * во внутреннем span (`.badge` daisyUI — inline-flex, сам текст не усекает). Полный заголовок
 * остаётся в `title` и `aria-label`: усечение — форма, не потеря слов.
 * Уступает ПОСЛЕДНИМ (#2558): пол `BOARD_HOLD_BADGE_MIN_WIDTH_CLASS` держит минимум «Буфер пол…»,
 * внешний элемент сам не клипует (без `overflow-*`) — иначе клип съел бы пол.
 */
export const BoardOverflowHoldBadge: React.FC<BoardOverflowHoldBadgeProps> = ({ hold }) => {
  if (hold === null) {
    return null;
  }
  const label = hold.headline;
  const toneClass = hold.tone === 'warning' ? 'badge-warning' : 'badge-error';
  const className = `badge ${toneClass} badge-sm ${BOARD_HOLD_BADGE_MIN_WIDTH_CLASS} gap-1`;
  const text = <span className="min-w-0 truncate">{label}</span>;
  if (!hold.onOpenWindow) {
    return (
      <span
        className={className}
        title={hold.title}
        data-overflow-key={hold.overflowKey}
        data-overflow-tone={hold.tone}
        role="status"
      >
        {text}
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
      {text}
    </button>
  );
};
