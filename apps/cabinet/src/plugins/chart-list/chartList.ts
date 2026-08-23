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

/**
 * Разбор состава прогона — по родам записей. Приходит ТОЛЬКО со свежим прогоном.
 *
 * У восстановленной выборки его нет и не будет: это сведение о прогоне, а не о выборке, и в базе
 * оно не хранится. Поэтому подпись обязана работать в обоих случаях — с разбором и без, — и без
 * него НЕ ДОДУМЫВАТЬ причин.
 */
export interface ChartListDisplacedView {
  readonly entryId: string;
  readonly sampleId: string;
  readonly at: number;
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly structure: string;
  readonly flatness: number;
}

export interface ChartListDisplacementView {
  readonly keeperRank: number;
  readonly keeperEntryId: string;
  readonly displaced: readonly ChartListDisplacedView[];
}

export interface ChartListBreakdown {
  readonly tracks: number;
  readonly reports: number;
  readonly measured: number;
  readonly unmeasuredTracks: number;
  /**
   * Кто кого вытеснил как похожего — чтобы порог отсева можно было проверить СЛУХОМ, а не доводом.
   *
   * Владелец 23.08 оставил `minDistanceRatio` как есть и назвал условие, при котором его будет на
   * чём двигать: послушать оставленного и вытесненного подряд. Близнецы — порог хорош; разные
   * звуки — порог жаден. Счётчик «вытеснил N» на этот вопрос не отвечает.
   *
   * Пусто у критериев без отсева («громче фона», «похожесть на дрон») — там вытеснять некому.
   */
  readonly displacements: readonly ChartListDisplacementView[];
}

/**
 * Кого вытеснила строка с этим местом. Поиск по МЕСТУ, а не по индексу страницы: места сквозные,
 * страницы — нет, и на второй странице индекс уехал бы.
 */
export function displacedOfRank(
  breakdown: ChartListBreakdown | null,
  rank: number,
): readonly ChartListDisplacedView[] {
  if (!breakdown) return [];
  return breakdown.displacements.find((d) => d.keeperRank === rank)?.displaced ?? [];
}

export interface ChartListState {
  readonly volume: ChartListVolume;
  readonly criterion: ChartListCriterion;
  readonly busy: boolean;
  readonly selection: ChartListSelectionView | null;
  readonly breakdown: ChartListBreakdown | null;
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
  breakdown: null,
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
  breakdown: ChartListBreakdown | null = null,
): ChartListState {
  return { ...state, busy: false, selection, breakdown, refusal: null, error: null, page: 0 };
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

/**
 * Подпись состава прогона.
 *
 * ПОЧЕМУ ПЕРЕПИСАНА. Первый боевой прогон 22.08 показывал «запрошено 1301, у остальных звука нет».
 * Неправда: у 634 отчётов звука нет по природе, но ещё 338 треков звук ИМЕЛИ и просто не прошли
 * порог над фоном. Подпись сваливала оба случая в один и врала о материале.
 *
 * Без разбора причина НЕ НАЗЫВАЕТСЯ вовсе: у восстановленной выборки разбора нет, и додумывать
 * «наверное, звука не было» значило бы вернуть ту же ложь другим путём.
 */
/** Сшить вытесненных с записями ленты — тем же способом, что и строки выборки. */
export function joinDisplaced<T extends JoinableItem>(
  displaced: readonly ChartListDisplacedView[],
  items: readonly T[],
): readonly { readonly row: ChartListDisplacedView; readonly item: T | null }[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return displaced.map((row) => ({ row, item: byId.get(row.entryId) ?? null }));
}

export function compositionLine(
  selection: ChartListSelectionView,
  breakdown: ChartListBreakdown | null,
): string {
  const head = `Отобрано ${selection.picks.length} из ${selection.measured} измеренных`;
  const tail = selection.shortfall > 0 ? `; не хватило ${selection.shortfall} до заказанного объёма` : '';
  if (!breakdown) {
    return `${head}; запрошено ${selection.asked} записей${tail}`;
  }
  const parts = [`в задании ${breakdown.tracks} треков и ${breakdown.reports} отчётов`];
  if (breakdown.reports > 0) parts.push('у отчётов звука нет по природе');
  if (breakdown.unmeasuredTracks > 0) {
    // Две причины, а различить их нечем: порт отдаёт кандидатов, не отчёт о выбывших.
    parts.push(`ещё ${breakdown.unmeasuredTracks} треков не измерены — без пробы либо тише порога над фоном`);
  }
  return `${head}; ${parts.join(', ')}${tail}`;
}

/** Подпись превышения: число с единицей, а не голая цифра. */
export const formatDeltaDb = (v: number): string => `${v >= 0 ? '+' : ''}${v.toFixed(1)} дБ над фоном`;

/** Ярлык структуры по-человечески. Плоскостность остаётся числом рядом, для тех, кто смотрит. */
export const structureLabel = (s: string): string =>
  s === 'tonal' ? 'тональный' : s === 'broadband' ? 'широкополосный' : s;
