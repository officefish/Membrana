import React from 'react';

import type { BoardOverflowHoldView } from './board-overflow-hold.js';

export interface BoardOverflowHoldBadgeProps {
  readonly hold: BoardOverflowHoldView | null;
}

/**
 * Бейдж «Буфер полон» в шапке доски (M5 (в), T8): тот же факт, что в окне и на плашке
 * микрофона, той же лексикой. Клик открывает то же окно того же `overflowId` — не второе.
 */
export const BoardOverflowHoldBadge: React.FC<BoardOverflowHoldBadgeProps> = ({ hold }) => {
  if (hold === null) {
    return null;
  }
  const label = `Буфер полон · ${hold.reasonText}`;
  const className = 'badge badge-error badge-sm shrink-0 gap-1';
  if (!hold.onOpenWindow) {
    return (
      <span className={className} title={hold.title} data-overflow-key={hold.overflowKey} role="status">
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
      aria-label={`${label}. ${hold.remainingText}. Открыть окно оператора`}
      onClick={hold.onOpenWindow}
    >
      {label}
    </button>
  );
};
