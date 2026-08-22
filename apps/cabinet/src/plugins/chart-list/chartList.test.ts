/**
 * Зубы ядра чарт-листа. Блок c6a спринта `chart-list-plugin`.
 *
 * Проверяются решения, а не рендер: что закрытые списки закрыты, что отказ и сбой связи — разные
 * вещи, и что запись, выпавшая из загруженной ленты, не исчезает из списка молча.
 */
import { describe, expect, it } from 'vitest';

import {
  CHART_LIST_CRITERIA,
  CHART_LIST_VOLUMES,
  formatDeltaDb,
  initialChartListState,
  isChartListCriterion,
  isChartListVolume,
  joinWithItems,
  pageCount,
  pagePicks,
  receiveError,
  receiveRefusal,
  receiveSelection,
  setCriterion,
  setPage,
  setVolume,
  startGenerating,
  structureLabel,
  type ChartListPickView,
  type ChartListSelectionView,
} from './chartList';

const pick = (rank: number, entryId = `e${rank}`): ChartListPickView => ({
  rank,
  entryId,
  sampleId: `s${rank}`,
  deltaDb: 30 - rank,
  peakDb: -12,
  structure: rank % 2 === 0 ? 'broadband' : 'tonal',
  flatness: 0.05,
  displaced: 0,
});

const selection = (n: number): ChartListSelectionView => ({
  id: 'sel-1',
  criterion: 'loudness-over-floor',
  volume: 20,
  asked: n + 5,
  measured: n,
  shortfall: 0,
  createdAt: '2026-08-22T11:00:00.000Z',
  picks: Array.from({ length: n }, (_, i) => pick(i + 1)),
});

describe('закрытые списки совпадают с серверными', () => {
  it('объёмы — ровно заказ владельца', () => {
    expect([...CHART_LIST_VOLUMES]).toEqual([200, 100, 60, 20]);
    expect(isChartListVolume(50)).toBe(false);
  });

  it('критериев ровно три, и четвёртого не завести', () => {
    expect(CHART_LIST_CRITERIA).toHaveLength(3);
    expect(isChartListCriterion('rare')).toBe(false);
  });

  it('негодная настройка НЕ меняет состояние — тихой подстановки нет', () => {
    expect(setVolume(initialChartListState, 50)).toBe(initialChartListState);
    expect(setCriterion(initialChartListState, 'rare')).toBe(initialChartListState);
  });
});

describe('сборка выборки', () => {
  it('смена настройки прошлую выборку НЕ стирает — человек вправе смотреть и передумывать', () => {
    const s = receiveSelection(initialChartListState, selection(3));
    expect(setVolume(s, 60).selection?.picks).toHaveLength(3);
    expect(setCriterion(s, 'drone-likeness').selection?.picks).toHaveLength(3);
  });

  it('начало сборки гасит прошлый отказ, но не прошлую выборку', () => {
    let s = receiveSelection(initialChartListState, selection(2));
    s = receiveRefusal(s, 'floor-not-measured');
    s = startGenerating(s);
    expect(s.busy).toBe(true);
    expect(s.refusal).toBeNull();
    expect(s.selection?.picks).toHaveLength(2);
  });

  it('новая выборка возвращает на первую страницу — иначе человек смотрел бы в пустоту', () => {
    let s = receiveSelection(initialChartListState, selection(60));
    s = setPage(s, 2);
    expect(s.page).toBe(2);
    s = receiveSelection(s, selection(5));
    expect(s.page).toBe(0);
  });

  it('отказ отбора и сбой связи — РАЗНЫЕ поля: они говорят человеку разное', () => {
    const refused = receiveRefusal(initialChartListState, 'floor-not-measured');
    expect(refused.refusal).toBe('floor-not-measured');
    expect(refused.error).toBeNull();

    const failed = receiveError(initialChartListState, 'сеть недоступна');
    expect(failed.error).toBe('сеть недоступна');
    expect(failed.refusal).toBeNull();
  });

  it('и отказ, и сбой снимают ожидание — кнопка не остаётся вечно занятой', () => {
    const busy = startGenerating(initialChartListState);
    expect(receiveRefusal(busy, 'x').busy).toBe(false);
    expect(receiveError(busy, 'y').busy).toBe(false);
  });
});

describe('пагинация', () => {
  it('страниц столько, сколько нужно для всех строк', () => {
    expect(pageCount(receiveSelection(initialChartListState, selection(60)))).toBe(3);
    expect(pageCount(receiveSelection(initialChartListState, selection(5)))).toBe(1);
    expect(pageCount(initialChartListState)).toBe(0);
  });

  it('страница за пределы не выходит', () => {
    const s = receiveSelection(initialChartListState, selection(25));
    expect(setPage(s, 99).page).toBe(1);
    expect(setPage(s, -5).page).toBe(0);
  });

  it('строки страницы — свой кусок, а не весь список', () => {
    const s = setPage(receiveSelection(initialChartListState, selection(45)), 1);
    const rows = pagePicks(s);
    expect(rows).toHaveLength(20);
    expect(rows[0]?.rank).toBe(21);
  });

  it('последняя страница короче — и это не ошибка', () => {
    const s = setPage(receiveSelection(initialChartListState, selection(45)), 2);
    expect(pagePicks(s)).toHaveLength(5);
  });
});

describe('сшивка с лентой', () => {
  it('строка находит свою запись по адресу', () => {
    const rows = joinWithItems([pick(1, 'запись-1')], [{ id: 'запись-1' }]);
    expect(rows[0]?.item).toEqual({ id: 'запись-1' });
  });

  it('запись вне загруженной ленты НЕ исчезает — список не станет короче, чем он есть', () => {
    const rows = joinWithItems([pick(1, 'есть'), pick(2, 'нет-в-ленте')], [{ id: 'есть' }]);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.item).toBeNull();
    expect(rows[1]?.pick.deltaDb).toBeDefined();
  });

  it('порядок выборки сохраняется — он и есть результат отбора', () => {
    const rows = joinWithItems([pick(1, 'b'), pick(2, 'a')], [{ id: 'a' }, { id: 'b' }]);
    expect(rows.map((r) => r.pick.rank)).toEqual([1, 2]);
  });
});

describe('подписи', () => {
  it('превышение — число с единицей, а не голая цифра', () => {
    expect(formatDeltaDb(18.34)).toBe('+18.3 дБ над фоном');
    expect(formatDeltaDb(-2)).toBe('-2.0 дБ над фоном');
  });

  it('структура названа по-человечески', () => {
    expect(structureLabel('tonal')).toBe('тональный');
    expect(structureLabel('broadband')).toBe('широкополосный');
  });
});
