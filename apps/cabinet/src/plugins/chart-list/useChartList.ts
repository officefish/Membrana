/**
 * Состояние чарт-листа на странице. Блок c6b спринта `chart-list-plugin`.
 *
 * Тонкая обёртка над чистым ядром `chartList.ts`: правила живут там и проверены зубами без DOM,
 * здесь только `useState` и разговор с сервером. Хук — не место для правил, иначе правила станут
 * непроверяемыми вместе с ним.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { generateChartList, listChartLists } from '@/api/journal';
import { fetchAllJournalItems } from '@/lib/fetchAllJournalItems';

import {
  initialChartListState,
  receiveError,
  receiveRefusal,
  receiveSelection,
  setCriterion,
  setPage,
  setVolume,
  startGenerating,
  type ChartListState,
} from './chartList';

export interface UseChartList {
  readonly state: ChartListState;
  readonly setVolume: (v: number) => void;
  readonly setCriterion: (c: string) => void;
  readonly setPage: (p: number) => void;
  /** Собрать выборку ПО ВСЕЙ хронике устройства, а не по загруженной странице. */
  readonly generate: () => void;
}

/**
 * @param deviceId устройство, чья хроника отбирается. Без него собирать не из чего.
 */
export function useChartList(deviceId: string | null): UseChartList {
  const [state, setState] = useState<ChartListState>(initialChartListState);

  /**
   * Зеркало состояния для асинхронной отправки.
   *
   * Между нажатием кнопки и уходом запроса человек может успеть сменить настройку, и отправить
   * старые значения значило бы собрать не то, что показано выбранным. Ссылка, а не чтение через
   * `setState`: setState — запись, и пользоваться им как чтением значит вызывать лишний рендер
   * ради значения, которое и так под рукой.
   */
  const latest = useRef(state);
  latest.current = state;

  /**
   * Восстановление последней выборки при входе на страницу.
   *
   * Т3: выборка остаётся и открывается ЗАВТРА, а не собирается заново. Без этого шага адрес
   * выборки существовал бы только в API, а человек каждый раз начинал бы с пустого места —
   * то есть обещание Т3 выполнялось бы на словах.
   */
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const recent = await listChartLists(1);
        const last = recent[0];
        if (alive && last) setState((s) => receiveSelection(s, last));
      } catch {
        // Молча: не восстановилось — человек соберёт заново. Это не отказ отбора и не сбой,
        // о котором стоит кричать поверх пустой страницы.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const generate = useCallback(
    () => {
      if (!deviceId) return;
      setState((s) => startGenerating(s));
      void (async () => {
        try {
          // Т1: отбор идёт ПО ВСЕМУ ЖУРНАЛУ. Загруженная страница — то, что видно человеку, а не
          // то, из чего отбирают: послать её значило бы тихо сузить тезис владельца до видимого
          // куска, да ещё и сделать inputHash зависимым от прокрутки и фильтра.
          const whole = await fetchAllJournalItems(deviceId);
          const out = await generateChartList({
            entryIds: whole.items.map((i) => i.id),
            volume: latest.current.volume,
            criterion: latest.current.criterion,
          });
          setState((s) =>
            out.selection
              ? receiveSelection(s, out.selection, out.breakdown ?? null)
              : receiveRefusal(s, out.refusal?.reason ?? 'no-result'),
          );
        } catch (e) {
          setState((s) => receiveError(s, e instanceof Error ? e.message : 'сбой связи'));
        }
      })();
    },
    [deviceId],
  );

  return {
    state,
    setVolume: useCallback((v: number) => setState((s) => setVolume(s, v)), []),
    setCriterion: useCallback((c: string) => setState((s) => setCriterion(s, c)), []),
    setPage: useCallback((p: number) => setState((s) => setPage(s, p)), []),
    generate,
  };
}
