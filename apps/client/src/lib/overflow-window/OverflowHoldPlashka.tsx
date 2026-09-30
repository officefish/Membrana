import type { ReactNode } from 'react';

import { getOverflowWindowController } from './controller';
import { formatOverflowAt } from './reasonTexts';
import { useOverflowHoldBoardView } from './useOverflowHoldBoardView';
import { useOverflowHoldEpisode } from './useOverflowHoldEpisode';

/**
 * Плашка удержания на панели записи/квоты (M5 (в), T8) — честный слой вне окна: заголовок по
 * состоянию места + остаток по живой оси причины (#2533), тот же строитель строк, что у бейджа
 * доски; клик открывает ТО ЖЕ окно того же `overflowId`. Лексика — из единственной таблицы
 * `reasonTexts.ts`. Вход первый — панель микрофона.
 */
export function OverflowHoldPlashka(): ReactNode {
  const episode = useOverflowHoldEpisode();
  const view = useOverflowHoldBoardView();
  if (episode === null || view === null) return null;
  const toneClass = view.tone === 'warning' ? 'alert-warning' : 'alert-error';
  return (
    <div
      className={`alert ${toneClass} flex flex-wrap items-center justify-between gap-2 py-2 text-sm`}
      role="alert"
      data-testid="overflow-hold-plashka"
      data-overflow-key={view.overflowKey}
      data-overflow-tone={view.tone}
    >
      <span>
        <span className="font-semibold">{view.headline}</span>
        {' · '}
        {view.remainingText}
        <span className="ml-1 text-xs opacity-70">с {formatOverflowAt(episode.overflowAt)}</span>
      </span>
      <button
        type="button"
        className="btn btn-outline btn-xs"
        onClick={() => getOverflowWindowController().openForCurrentEpisode()}
      >
        Что делать
      </button>
    </div>
  );
}
