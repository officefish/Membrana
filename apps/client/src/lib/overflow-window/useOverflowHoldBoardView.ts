import { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { BoardOverflowHoldView } from '@membrana/device-board';
import {
  getDefaultMediaLibraryService,
  type MediaLibraryService,
  type StorageQuota,
} from '@membrana/media-library-service';

import type { OverflowHoldEpisode } from '@/lib/device-overflow-hold';

import { getOverflowWindowController } from './controller';
import {
  OVERFLOW_ALIVE_TEXT,
  OVERFLOW_PHASE_TEXT,
  OVERFLOW_TITLE_BY_STANDING,
  describeOverflowReason,
  formatAxisRemaining,
  formatOverflowAt,
} from './reasonTexts';
import { useOverflowHoldEpisode } from './useOverflowHoldEpisode';
import { episodeWindowKey, judgeOverflowStanding, liveAxesFromQuota } from './viewModel';

/**
 * Чистый строитель строк для бейджа, статуса доски и плашки панели (#2533): эпизод — факт
 * остановки (вещдок), живая квота — место сейчас. Заголовок и тон — по состоянию места тем же
 * судьёй, что у окна (`judgeOverflowStanding`); удержание от места не зависит. Живой оси нет →
 * остаток из снимка остановки и прежнее слово о факте (`unknown`).
 */
export function buildBoardOverflowHoldView(
  episode: OverflowHoldEpisode,
  quota: StorageQuota | null,
  onOpenWindow: () => void,
): BoardOverflowHoldView {
  const reason = describeOverflowReason(episode.reason);
  const atStop = reason.axis === 'userStorage' ? episode.userStorage : episode.buffer;
  const live = quota === null || reason.axis === null ? null : liveAxesFromQuota(quota)[reason.axis];
  const standing = judgeOverflowStanding(live);
  const axis = live ?? atStop;
  const reasonText = reason.rawCode === null ? reason.text : `${reason.text} (${reason.rawCode})`;
  const phase = episode.overflowId === null ? 'held_local' : 'held';
  const headline =
    standing === 'freed' ? OVERFLOW_TITLE_BY_STANDING.freed : `${OVERFLOW_TITLE_BY_STANDING[standing]} · ${reasonText}`;
  const remainingText = formatAxisRemaining(axis);
  return {
    overflowKey: episodeWindowKey(episode),
    headline,
    tone: standing === 'freed' ? 'warning' : 'error',
    reasonText,
    phaseText: OVERFLOW_PHASE_TEXT[phase],
    remainingText,
    aliveText: OVERFLOW_ALIVE_TEXT,
    title: `${headline} · ${remainingText} · с ${formatOverflowAt(episode.overflowAt)}`,
    onOpenWindow,
  };
}

/**
 * Адаптер доски устройства (второй вход, M5 (г)/T6): тот же эпизод носителя → готовые строки
 * для бейджа и статуса `@membrana/device-board`. Пакет доски своих слов о причинах не имеет —
 * все тексты из единственной таблицы `reasonTexts.ts`; клик — то же окно того же id.
 *
 * Живая ось — из снимка сервиса библиотеки (`getSnapshot`, подписка `useSyncExternalStore`),
 * без сети: перечитывает квоту только хост окна (#2444) и любой другой читатель; здесь — чтение
 * того, что уже прочитано. Отдельного файла под три строки подписки нет (резчик, #2533).
 */
export function useOverflowHoldBoardView(
  service: MediaLibraryService = getDefaultMediaLibraryService(),
): BoardOverflowHoldView | null {
  const episode = useOverflowHoldEpisode();
  const subscribe = useCallback((onChange: () => void) => service.subscribe(onChange), [service]);
  const readQuota = useCallback(() => service.getSnapshot().quota, [service]);
  const quota = useSyncExternalStore(subscribe, readQuota, readQuota);
  return useMemo(() => {
    if (episode === null) return null;
    return buildBoardOverflowHoldView(episode, quota, () => {
      getOverflowWindowController().openForCurrentEpisode();
    });
  }, [episode, quota]);
}
