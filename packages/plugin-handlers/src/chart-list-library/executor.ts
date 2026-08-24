/**
 * Исполнитель отбора в библиотеке (#2110): окно → измерение → отбор, одной функцией.
 *
 * ПОРЯДОК НЕСУЩИЙ, и он тот же, что у журнальной витрины (блок c6a):
 *   1. настройки судятся ДО измерения — мерить набор ради отказа по опечатке значит жечь ресурс;
 *   2. ОКНО судится тоже до измерения, и по той же причине: главный заказчик — разборка 1136
 *      ночных проб, и мерить всю ночь, чтобы показать один час, — ровно то, от чего окно заведено;
 *   3. измеряются только пробы, попавшие в окно;
 *   4. отбор режет по объёму и критерию тем же ядром, что у журнала.
 *
 * ЯДРО НЕ КОПИРУЕТСЯ. Логика границ окна — `filterByDateWindow` из ядра (одна на пробы и
 * кандидатов: две копии правила «границы включительны» разъехались бы молча). Отбор —
 * `selectChartList` как есть. Здесь только склейка и перевод измеренного в кандидатов.
 *
 * АДРЕС СТРОКИ. У журнальной витрины `entryId` — запись ленты. У библиотеки строка выборки —
 * ПРОБА: она и адресуется, и проигрывается по одному `sampleId`. Поэтому `entryId = sampleId`,
 * честно и без выдумывания второй сущности; `at` — момент создания пробы, его приносит
 * вызывающий вместе со списком (у ядра часов и базы нет).
 */
import {
  CHART_LIST_DEFAULTS,
  filterByDateWindow,
  isChartListCriterion,
  isChartListVolume,
  selectChartList,
  type ChartListDateWindow,
  type ChartListRefusal,
  type ChartListSelection,
  type ChartListTuning,
} from '../chart-list/selection.js';
import type { MeasuredCandidate } from '../chart-list-measure/executor.js';

/** Проба набора, как её видит отбор: адрес и момент создания. Метаданные, не звук. */
export interface LibrarySampleRef {
  readonly sampleId: string;
  /** Момент создания пробы, epoch ms — по нему работает окно дат. */
  readonly at: number;
}

/** Настройки человека. Негодные не подставляются молча — отбор откажет названной причиной. */
export interface LibraryChartListSettings {
  readonly volume: number;
  readonly criterion: string;
}

/** Порт измерения: меряет НАЗВАННЫЕ пробы там, где лежит звук. Захватывать всю коллекцию нельзя. */
export interface LibraryMeasurePort {
  measure(sampleIds: readonly string[]): Promise<readonly MeasuredCandidate[]>;
}

export interface LibraryChartListOutcome {
  readonly selection: ChartListSelection;
  /** Проб в наборе всего / попало в окно / измерено — расхождения видны, а не съедены. */
  readonly inSet: number;
  readonly inWindow: number;
  readonly measured: number;
}

/** Годны ли настройки — то же правило, что у журнальной витрины, и спрошено до измерения. */
export function librarySettingsUsable(s: LibraryChartListSettings): boolean {
  return isChartListVolume(s.volume) && isChartListCriterion(s.criterion);
}

/** Выборка-отказ: форма полная, причина названа. Ядро такой сборки не даёт — она про склейку. */
function refusedSelection(
  settings: LibraryChartListSettings,
  refusal: ChartListRefusal,
): ChartListSelection {
  const volume = isChartListVolume(settings.volume) ? settings.volume : 20;
  const criterion = isChartListCriterion(settings.criterion) ? settings.criterion : 'loudness-over-floor';
  return { criterion, volume, picks: [], shortfall: volume, displacements: [], refusal };
}

export async function runLibraryChartList(
  port: LibraryMeasurePort,
  samples: readonly LibrarySampleRef[],
  settings: LibraryChartListSettings,
  window: ChartListDateWindow | null = null,
  tuning: ChartListTuning = CHART_LIST_DEFAULTS,
): Promise<LibraryChartListOutcome> {
  // 1. Настройки — до всего: негодный объём или критерий отбор назовёт сам, измерение не нужно.
  if (!librarySettingsUsable(settings)) {
    return {
      selection: selectChartList([], settings.criterion, settings.volume, tuning),
      inSet: samples.length,
      inWindow: 0,
      measured: 0,
    };
  }

  // 2. Окно — до измерения, тем же правилом границ, что у ядра. Отказ окна (перепутанные границы,
  //    пустой промежуток) доезжает до человека той же формой, что отказ отбора.
  const windowed = filterByDateWindow(samples, window);
  if (windowed.refusal) {
    return {
      selection: refusedSelection(settings, windowed.refusal),
      inSet: samples.length,
      inWindow: 0,
      measured: 0,
    };
  }

  // 3. Меряются только попавшие в окно. Меньше измеренных, чем заказано, — законно: часть проб
  //    может не раскодироваться, и measure говорит об этом своим отказом, не пустышками.
  const atOf = new Map(windowed.candidates.map((s) => [s.sampleId, s.at]));
  const measured = await port.measure(windowed.candidates.map((s) => s.sampleId));

  // 4. Отбор — ядром. Окно НЕ передаётся второй раз: оно уже применено к пробам, и кандидаты несут
  //    те же `at`; повторное применение было бы no-op, а расхождение счётчиков — ложью.
  const candidates = measured.map((m) => ({
    entryId: m.sampleId,
    sampleId: m.sampleId,
    at: atOf.get(m.sampleId) ?? 0,
    deltaDb: m.deltaDb,
    peakDb: m.peakDb,
    flatness: m.flatness,
    structure: m.structure,
    durationSec: m.durationSec,
    features: m.features,
  }));
  return {
    selection: selectChartList(candidates, settings.criterion, settings.volume, tuning),
    inSet: samples.length,
    inWindow: windowed.candidates.length,
    measured: candidates.length,
  };
}
