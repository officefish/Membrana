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
 *
 * Место в шапке (#2552): бейдж уступает — `min-w-0` вместо `shrink-0`, текст усекается многоточием
 * во внутреннем span (`.badge` daisyUI — inline-flex, сам текст не усекает). Полный заголовок
 * остаётся в `title` и `aria-label`: усечение — форма, не потеря слов.
 */
export const BoardOverflowHoldBadge: React.FC<BoardOverflowHoldBadgeProps> = ({ hold }) => {
  if (hold === null) {
    return null;
  }
  const label = hold.headline;
  const toneClass = hold.tone === 'warning' ? 'badge-warning' : 'badge-error';
  const className = `badge ${toneClass} badge-sm min-w-0 gap-1`;
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
