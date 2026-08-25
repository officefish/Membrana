/**
 * Исполнитель витрины дублей (#2109, b2): окно → измерение → пары, одной функцией.
 *
 * ПОРЯДОК ТОТ ЖЕ, что у витрины отбора: окно судится ДО измерения (мерить всю ночь ради часа —
 * то, от чего окно заведено), меряются только попавшие в окно, пары считает ядро как есть.
 * Ядро не копируется: границы окна — `filterByDateWindow`, похожесть — `findDuplicatePairs`.
 *
 * ЗДЕСЬ НЕТ УДАЛЕНИЯ, как и в ядре. Исполнитель отдаёт отчёт о парах и счётчики; что с парами
 * делать — решает человек в панели, и только по клику. Витрина не знает глагола «удалить».
 */
import {
  CHART_LIST_DEFAULTS,
  filterByDateWindow,
  type ChartListDateWindow,
  type ChartListTuning,
} from '../chart-list/selection.js';
import { findDuplicatePairs, type DuplicatesReport } from '../chart-list/duplicates.js';
import type { LibraryMeasurePort, LibrarySampleRef } from '../chart-list-library/executor.js';

export interface LibraryDuplicatesOutcome {
  readonly report: DuplicatesReport;
  /** Проб в наборе всего / попало в окно / измерено — расхождения видны, а не съедены. */
  readonly inSet: number;
  readonly inWindow: number;
  readonly measured: number;
}

export async function runLibraryDuplicates(
  port: LibraryMeasurePort,
  samples: readonly LibrarySampleRef[],
  window: ChartListDateWindow | null = null,
  tuning: ChartListTuning = CHART_LIST_DEFAULTS,
): Promise<LibraryDuplicatesOutcome> {
  // 1. Окно — до измерения. Отказ окна доезжает до человека той же формой, что отказ ядра.
  const windowed = filterByDateWindow(samples, window);
  if (windowed.refusal) {
    return {
      report: {
        groups: [],
        candidatesSeen: 0,
        duplicatesFound: 0,
        passport: { minDistanceRatio: tuning.minDistanceRatio, inherited: true },
        refusal: { reason: 'no-candidates', detail: windowed.refusal.detail },
      },
      inSet: samples.length,
      inWindow: 0,
      measured: 0,
    };
  }

  // 2. Меряются только попавшие в окно.
  const atOf = new Map(windowed.candidates.map((s) => [s.sampleId, s.at]));
  const measured = await port.measure(windowed.candidates.map((s) => s.sampleId));

  // 3. Пары — ядром, без лимита, без удаления.
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
    report: findDuplicatePairs(candidates, tuning),
    inSet: samples.length,
    inWindow: windowed.candidates.length,
    measured: candidates.length,
  };
}
