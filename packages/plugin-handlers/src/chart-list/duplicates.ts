/**
 * Пары похожих в НАБОРЕ — ядро чистки дублей (#2109, блок b1).
 *
 * ЧТО ЭТО. Тот же отсев, что в критерии «разнообразие звука», но применённый к коллекции
 * целиком и БЕЗ ЛИМИТА: отбор оставляет двадцать и выбрасывает остальных, чистка же должна
 * назвать КАЖДОГО похожего и его вытеснителя. Мера похожести одна — `dedupeGreedy` над теми же
 * осями признаков (`normalizeFeatures`); вторую правду о похожести здесь не заводим.
 *
 * ЧЕГО ЗДЕСЬ НЕТ — УДАЛЕНИЯ. Слово владельца 23.08: цена ошибки у выбора и у стирания разная.
 * Ошибся порог при отборе — список хуже, материал цел; при удалении — материал исчез. Порог
 * `minDistanceRatio` УНАСЛЕДОВАН от отбора без перепроверки (измерить его нечем: в материале
 * нет ни одного примера цели), и потому ядро отдаёт ПАРЫ, а не приговор: «вот эти я считаю
 * дублями, послушай» → слово человека → удаление ТОЛЬКО по клику, на стороне панели. Ядро
 * чистое: не мутирует вход, не возвращает списка «на удаление», не знает, что такое удалить.
 *
 * КТО ВЫТЕСНИТЕЛЬ. Обход в порядке убывания громкости — как в отборе: громкий остаётся
 * представителем группы, тихий похожий числится вытесненным. Для человека это ориентир, не
 * вердикт: панель показывает обоих рядом и даёт послушать подряд.
 *
 * ОТСЕВ СЛЕП КО ВРЕМЕНИ (замер 23.08): среди осей нет времени, два выстрела через пять секунд
 * и два похожих звука через сутки для него одно и то же. Поэтому у каждого адреса в паре есть
 * `at` — человек видит соседство по времени первым, отсев его не видит вовсе.
 */
import { dedupeGreedy, normalizeFeatures } from '../session-metrics/index.js';

import {
  CHART_LIST_DEFAULTS,
  type ChartListCandidate,
  type ChartListDisplaced,
  type ChartListTuning,
} from './selection.js';

/** Группа похожих: представитель и вытесненные им. Одна запись на представителя с ≥1 похожим. */
export interface DuplicateGroup {
  readonly keeper: ChartListDisplaced;
  readonly duplicates: readonly ChartListDisplaced[];
}

export type DuplicatesRefusalReason = 'no-candidates' | 'too-few';

export interface DuplicatesRefusal {
  readonly reason: DuplicatesRefusalReason;
  readonly detail: string;
}

export interface DuplicatesReport {
  readonly groups: readonly DuplicateGroup[];
  /** Сколько проб смотрели, сколько из них попали в пары как похожие. */
  readonly candidatesSeen: number;
  readonly duplicatesFound: number;
  /**
   * Порог — числом и с пометкой, что он унаследован от отбора, а не проверен для стирания.
   * Панель обязана показать это слово рядом с парами, чтобы человек знал цену числу.
   */
  readonly passport: { readonly minDistanceRatio: number; readonly inherited: true };
  readonly refusal: DuplicatesRefusal | null;
}

const asDisplaced = (c: ChartListCandidate): ChartListDisplaced => ({
  entryId: c.entryId,
  sampleId: c.sampleId,
  at: c.at,
  deltaDb: c.deltaDb,
  peakDb: c.peakDb,
  structure: c.structure,
  flatness: c.flatness,
});

const passportOf = (tuning: ChartListTuning) =>
  ({ minDistanceRatio: tuning.minDistanceRatio, inherited: true }) as const;

/**
 * Найти пары похожих во всём наборе. Ничего не удаляет и не предлагает удалить.
 *
 * Отказ приходит вместо групп: «кандидатов нет» и «одна проба — сравнивать не с чем» — разные
 * события, и пустой список их бы смешал.
 */
export function findDuplicatePairs(
  candidates: readonly ChartListCandidate[],
  tuning: ChartListTuning = CHART_LIST_DEFAULTS,
): DuplicatesReport {
  const passport = passportOf(tuning);
  if (candidates.length === 0) {
    return {
      groups: [],
      candidatesSeen: 0,
      duplicatesFound: 0,
      passport,
      refusal: { reason: 'no-candidates', detail: 'измеренных проб нет — сравнивать нечего' },
    };
  }
  if (candidates.length < 2) {
    return {
      groups: [],
      candidatesSeen: 1,
      duplicatesFound: 0,
      passport,
      refusal: { reason: 'too-few', detail: 'в наборе одна проба — дублей быть не может' },
    };
  }

  const sorted = [...candidates].sort((a, b) => b.deltaDb - a.deltaDb);
  const vectors = normalizeFeatures(
    sorted.map((c) => c.features),
    sorted.map((c) => c.durationSec),
  );
  const order = sorted.map((_, i) => i);
  // Лимит = весь набор: чистке нужен каждый похожий, а не первые двадцать.
  const { kept, droppedAs } = dedupeGreedy(vectors, order, tuning.minDistanceRatio, sorted.length);

  const byKeeper = new Map<number, number[]>();
  for (const [dropped, keeper] of droppedAs) {
    const list = byKeeper.get(keeper);
    if (list) list.push(dropped);
    else byKeeper.set(keeper, [dropped]);
  }

  const groups = kept.flatMap<DuplicateGroup>((idx) => {
    const dropped = byKeeper.get(idx);
    if (!dropped || dropped.length === 0) return [];
    return [
      {
        keeper: asDisplaced(sorted[idx]!),
        // Внутри группы — по времени: соседство по времени человек слышит первым.
        duplicates: dropped.map((d) => asDisplaced(sorted[d]!)).sort((a, b) => a.at - b.at),
      },
    ];
  });

  return {
    groups,
    candidatesSeen: candidates.length,
    duplicatesFound: droppedAs.size,
    passport,
    refusal: null,
  };
}
