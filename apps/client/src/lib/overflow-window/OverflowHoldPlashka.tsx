import type { ReactNode } from 'react';

import { getOverflowWindowController } from './controller';
import { describeOverflowReason, formatAxisRemaining, formatOverflowAt } from './reasonTexts';
import { useOverflowHoldEpisode } from './useOverflowHoldEpisode';
import { episodeWindowKey } from './viewModel';

/**
 * Плашка «буфер полон» на панели записи/квоты (M5 (в), T8) — честный слой вне окна:
 * причина + остаток по оси причины; клик открывает ТО ЖЕ окно того же `overflowId`.
 * Лексика — из единственной таблицы `reasonTexts.ts`. Вход первый — панель микрофона.
 */
export function OverflowHoldPlashka(): ReactNode {
  const episode = useOverflowHoldEpisode();
  if (episode === null) return null;
  const reason = describeOverflowReason(episode.reason);
  const axis = reason.axis === 'userStorage' ? episode.userStorage : episode.buffer;
  return (
    <div
      className="alert alert-error flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
      role="alert"
      data-testid="overflow-hold-plashka"
      data-overflow-key={episodeWindowKey(episode)}
    >
      <span>
        <span className="font-semibold">Буфер полон</span> · {reason.text}
        {reason.rawCode !== null ? <span className="ml-1 font-mono text-xs opacity-60">{reason.rawCode}</span> : null}
        {' · '}
        {formatAxisRemaining(axis)}
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
