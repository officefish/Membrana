import { useMemo } from 'react';

import type { BoardOverflowHoldView } from '@membrana/device-board';

import { getOverflowWindowController } from './controller';
import {
  OVERFLOW_ALIVE_TEXT,
  OVERFLOW_PHASE_TEXT,
  describeOverflowReason,
  formatAxisRemaining,
  formatOverflowAt,
} from './reasonTexts';
import { useOverflowHoldEpisode } from './useOverflowHoldEpisode';
import { episodeWindowKey } from './viewModel';

/**
 * Адаптер доски устройства (второй вход, M5 (г)/T6): тот же эпизод носителя → готовые строки
 * для бейджа и статуса `@membrana/device-board`. Пакет доски своих слов о причинах не имеет —
 * все тексты из единственной таблицы `reasonTexts.ts`; клик — то же окно того же id.
 */
export function useOverflowHoldBoardView(): BoardOverflowHoldView | null {
  const episode = useOverflowHoldEpisode();
  return useMemo(() => {
    if (episode === null) return null;
    const reason = describeOverflowReason(episode.reason);
    const axis = reason.axis === 'userStorage' ? episode.userStorage : episode.buffer;
    const phase = episode.overflowId === null ? 'held_local' : 'held';
    return {
      overflowKey: episodeWindowKey(episode),
      reasonText: reason.rawCode === null ? reason.text : `${reason.text} (${reason.rawCode})`,
      phaseText: OVERFLOW_PHASE_TEXT[phase],
      remainingText: formatAxisRemaining(axis),
      aliveText: OVERFLOW_ALIVE_TEXT,
      title: `${reason.text} · ${formatAxisRemaining(axis)} · с ${formatOverflowAt(episode.overflowAt)}`,
      onOpenWindow: () => {
        getOverflowWindowController().openForCurrentEpisode();
      },
    };
  }, [episode]);
}
