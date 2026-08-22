/**
 * Ядро чарт-листа на стороне кабинета. Блок c6a спринта `chart-list-plugin`.
 *
 * ЧИСТОЕ, БЕЗ REACT. Оснастка кабинета проверяет логику (`*.test.ts`), а не рендер: правила
 * «что выбрано», «можно ли собирать», «какая страница списка» живут функциями и проверяются без
 * DOM. То же разделение, что у механизма плагинов страницы — иначе правила стали бы
 * непроверяемыми вместе с компонентом.
 *
 * ГНЕЗДО ГОТОВО. Сайдбар, виджет под основным блоком и сворачивание сделаны почвой (коворк
 * `cowork-server-plugin-pages`). Чарт-лист в них ВСТАЁТ и своего не строит: настройки рисуются в
 * сайдбаре через `renderSettings`, список — в виджете через `renderWidget`.
 *
 * СТРОКА — ТА ЖЕ, ЧТО В ЖУРНАЛЕ. Выборка несёт адреса записей и измеренное; сами записи уже
 * загружены страницей. Поэтому здесь СШИВКА, а не второй источник: рисовать свою строку значило
 * бы завести вторую правду о треке, ровно то, из-за чего команда 3/3 отвергла гибрид.
 */

/** Объёмы выборки — заказ владельца, закрытый список. Совпадает с закрытым списком сервера. */
export const CHART_LIST_VOLUMES = [200, 100, 60, 20] as const;
export type ChartListVolume = (typeof CHART_LIST_VOLUMES)[number];

/** Критерии — та же закрытая тройка, что на сервере. Четвёртого нет. */
export const CHART_LIST_CRITERIA = [
  { id: 'loudness-over-floor', label: 'Превышение над фоном' },
  { id: 'spectral-variety', label: 'Разнообразие звука' },
  { id: 'drone-likeness', label: 'Похожесть на дрон' },
] as const;
export type ChartListCriterion = (typeof CHART_LIST_CRITERIA)[number]['id'];

/** Строка выборки, как её отдаёт сервер. */
export interface ChartListPickView {
  readonly rank: number;
  readonly entryId: string;
  readonly sampleId: string;
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly structure: string;
  readonly flatness: number;
  readonly displaced: number;
}

export interface ChartListSelectionView {
  readonly id: string;
  readonly criterion: string;
  readonly volume: number;
  readonly asked: number;
  readonly measured: number;
  readonly shortfall: number;
  readonly createdAt: string;
  readonly picks: readonly ChartListPickView[];
}

export interface ChartListState {
  readonly volume: ChartListVolume;
  readonly criterion: ChartListCriterion;
  readonly busy: boolean;
  readonly selection: ChartListSelectionView | null;
  /** Причина, названная сервером словами. Не «ошибка» — исход работы. */
  readonly refusal: string | null;
  readonly error: string | null;
  readonly page: number;
}

/** Умолчания: двадцать по превышению над фоном — самый привычный отбор из трёх. */
export const initialChartListState: ChartListState = {
  volume: 20,
  criterion: 'loudness-over-floor',
  busy: false,
  selection: null,
  refusal: null,
  error: null,
  page: 0,
};

export const CHART_LIST_PAGE_SIZE = 20;

export const isChartListVolume = (v: number): v is ChartListVolume =>
  (CHART_LIST_VOLUMES as readonly number[]).includes(v);

export const isChartListCriterion = (v: string): v is ChartListCriterion =>
  CHART_LIST_CRITERIA.some((c) => c.id === v);

/**
 * Сменить объём. Прошлая выборка НЕ стирается: человек вправе смотреть собранное, пока собирает
 * новое, — и вправе передумать, не потеряв то, что уже видит.
 */
export function setVolume(state: ChartListState, volume: number): ChartListState {
  if (!isChartListVolume(volume)) return state;
  return { ...state, volume };
}

export function setCriterion(state: ChartListState, criterion: string): ChartListState {
  if (!isChartListCriterion(criterion)) return state;
  return { ...state, criterion };
}

/** Начало сборки: гасит прошлый отказ и прошлую ошибку, но не прошлую выборку. */
export function startGenerating(state: ChartListState): ChartListState {
  return { ...state, busy: true, refusal: null, error: null };
}

/** Выборка пришла: страница сбрасывается на первую — иначе человек смотрел бы в пустоту. */
export function receiveSelection(
  state: ChartListState,
  selection: ChartListSelectionView,
): ChartListState {
  return { ...state, busy: false, selection, refusal: null, error: null, page: 0 };
}

/** Отказ — исход работы. Прошлая выборка остаётся: она по-прежнему верна для своего прогона. */
export function receiveRefusal(state: ChartListState, reason: string): ChartListState {
  return { ...state, busy: false, refusal: reason };
}

/** Сбой связи — не отказ отбора. Разные вещи, и человеку они говорят разное. */
export function receiveError(state: ChartListState, error: string): ChartListState {
  return { ...state, busy: false, error };
}

export function pageCount(state: ChartListState, size = CHART_LIST_PAGE_SIZE): number {
  const total = state.selection?.picks.length ?? 0;
  return total === 0 ? 0 : Math.ceil(total / size);
}

/** Страница списка. За пределы не выходит: пустая страница читалась бы как «ничего не нашлось». */
export function setPage(state: ChartListState, page: number, size = CHART_LIST_PAGE_SIZE): ChartListState {
  const count = pageCount(state, size);
  if (count === 0) return { ...state, page: 0 };
  const clamped = Math.min(Math.max(page, 0), count - 1);
  return { ...state, page: clamped };
}

export function pagePicks(
  state: ChartListState,
  size = CHART_LIST_PAGE_SIZE,
): readonly ChartListPickView[] {
  const picks = state.selection?.picks ?? [];
  return picks.slice(state.page * size, state.page * size + size);
}

/** Элемент ленты, минимально: сшивка идёт по адресу записи. */
export interface JoinableItem {
  readonly id: string;
}

export interface JoinedRow<T extends JoinableItem> {
  readonly pick: ChartListPickView;
  /** `null` — записи нет в загруженной ленте. Строка всё равно показывается, но без карточки. */
  readonly item: T | null;
}

/**
 * Сшить строки выборки с записями ленты.
 *
 * Запись, которой нет среди загруженных, НЕ выбрасывается: она в выборке есть, и молча её убрать
 * значило бы показать список короче, чем он на самом деле. Показывается измеренное, а карточки
 * нет — и это видно.
 */
export function joinWithItems<T extends JoinableItem>(
  picks: readonly ChartListPickView[],
  items: readonly T[],
): readonly JoinedRow<T>[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return picks.map((pick) => ({ pick, item: byId.get(pick.entryId) ?? null }));
}

/** Подпись превышения: число с единицей, а не голая цифра. */
export const formatDeltaDb = (v: number): string => `${v >= 0 ? '+' : ''}${v.toFixed(1)} дБ над фоном`;

/** Ярлык структуры по-человечески. Плоскостность остаётся числом рядом, для тех, кто смотрит. */
export const structureLabel = (s: string): string =>
  s === 'tonal' ? 'тональный' : s === 'broadband' ? 'широкополосный' : s;
