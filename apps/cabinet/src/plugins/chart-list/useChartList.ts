/**
 * Состояние чарт-листа на странице. Блок c6b спринта `chart-list-plugin`.
 *
 * Тонкая обёртка над чистым ядром `chartList.ts`: правила живут там и проверены зубами без DOM,
 * здесь только `useState` и разговор с сервером. Хук — не место для правил, иначе правила станут
 * непроверяемыми вместе с ним.
 */
import { useCallback, useRef, useState } from 'react';

import { generateChartList } from '@/api/journal';

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
  readonly generate: (entryIds: readonly string[]) => void;
}

export function useChartList(): UseChartList {
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

  const generate = useCallback(
    (entryIds: readonly string[]) => {
      setState((s) => startGenerating(s));
      void (async () => {
        try {
          const out = await generateChartList({
            entryIds,
            volume: latest.current.volume,
            criterion: latest.current.criterion,
          });
          setState((s) =>
            out.selection
              ? receiveSelection(s, out.selection)
              : receiveRefusal(s, out.refusal?.reason ?? 'no-result'),
          );
        } catch (e) {
          setState((s) => receiveError(s, e instanceof Error ? e.message : 'сбой связи'));
        }
      })();
    },
    [],
  );

  return {
    state,
    setVolume: useCallback((v: number) => setState((s) => setVolume(s, v)), []),
    setCriterion: useCallback((c: string) => setState((s) => setCriterion(s, c)), []),
    setPage: useCallback((p: number) => setState((s) => setPage(s, p)), []),
    generate,
  };
}
