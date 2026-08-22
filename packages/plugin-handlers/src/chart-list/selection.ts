/**
 * Ядро отбора чарт-листа. Блок c2a спринта `chart-list-plugin`.
 *
 * МЕРЫ ЗДЕСЬ НЕ ЖИВУТ. `deltaDb` над скользящим фоном, плоскостность, пик, разбор по структуре и
 * жадный отсев похожего уже написаны в `../session-metrics` и проверены на часовом сеансе 21.08.
 * Этот файл берёт УЖЕ ИЗМЕРЕННЫХ кандидатов и отвечает на единственный вопрос: кто попадает в
 * выборку и в каком порядке. Переписывать меры значило бы завести вторую правду о звуке.
 *
 * ЗВУКА ЗДЕСЬ ТОЖЕ НЕТ. Ни одна функция не принимает сэмплов: измерение идёт там, где блоб лежит
 * локально (media), а отбор — чистая функция над результатами измерения. Отсюда и проверяемость:
 * зубы гоняются на числах, без декодирования wav.
 *
 * ТРИ КРИТЕРИЯ — АЛЬТЕРНАТИВЫ, А НЕ СТУПЕНИ КОНВЕЙЕРА. Человек выбирает ОДИН (Т2: объём и
 * критерий — две настройки одного плагина). Поэтому «превышение над фоном» намеренно НЕ отсеивает
 * похожее: отсев есть отдельный критерий, и если бы первый делал работу второго, выбор между ними
 * перестал бы что-либо значить. Известное следствие: на вырожденном материале первый критерий
 * вернёт куски одного хлопка — для того и заведён второй.
 *
 * ЧЕТВЁРТОГО КРИТЕРИЯ НЕТ. «Редкие» отвергнуты командой 3/3: пропажа собаки и гула машин 21.08 —
 * дефект метрики (дедупликация либо порог `deltaDb`), а не отсутствующий критерий. Внутри этого
 * спринта пропажа НЕ чинится.
 */
import {
  dedupeGreedy,
  normalizeFeatures,
  shortfallOf,
  type EventFeatures,
  type EventStructure,
} from '../session-metrics/index.js';

/** Объёмы выборки — закрытый список из заказа владельца. Произвольного числа нет и не заводится. */
export const CHART_LIST_VOLUMES = [200, 100, 60, 20] as const;
export type ChartListVolume = (typeof CHART_LIST_VOLUMES)[number];

export const isChartListVolume = (v: number): v is ChartListVolume =>
  (CHART_LIST_VOLUMES as readonly number[]).includes(v);

/**
 * Критерии отбора — закрытая тройка, названная командой (Курёхин · Родченко · Дынин, 3/3).
 * Имена говорят, ЧТО меряется, а не как рисуется.
 */
export const CHART_LIST_CRITERIA = ['loudness-over-floor', 'spectral-variety', 'drone-likeness'] as const;
export type ChartListCriterion = (typeof CHART_LIST_CRITERIA)[number];

export const isChartListCriterion = (v: string): v is ChartListCriterion =>
  (CHART_LIST_CRITERIA as readonly string[]).includes(v);

/**
 * Измеренный кандидат. Приходит от того, кто держит звук; отбор его не добывает.
 *
 * `entryId` — адрес записи в ленте журнала, `sampleId` — адрес блоба в media. Оба нужны: по первому
 * строка находит себя в журнале, по второму проигрывается звук.
 */
export interface ChartListCandidate {
  readonly entryId: string;
  readonly sampleId: string;
  readonly at: number;
  /** Превышение над скользящим фоном, дБ — почему трек вообще замечен. */
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly flatness: number;
  readonly structure: EventStructure;
  readonly durationSec: number;
  readonly features: EventFeatures;
}

/** Строка выборки. Несёт ровно то, что владелец назвал: превышение над фоном, структура, пик. */
export interface ChartListPick {
  readonly entryId: string;
  readonly sampleId: string;
  readonly rank: number;
  readonly deltaDb: number;
  readonly peakDb: number;
  readonly structure: EventStructure;
  readonly flatness: number;
  /** Скольких похожих этот звук вытеснил. Осмысленно только у отсева; иначе 0. */
  readonly displaced: number;
}

export type ChartListRefusalReason = 'no-candidates' | 'unknown-criterion' | 'unknown-volume';

export interface ChartListRefusal {
  readonly reason: ChartListRefusalReason;
  readonly detail: string;
}

export interface ChartListSelection {
  readonly criterion: ChartListCriterion;
  readonly volume: ChartListVolume;
  readonly picks: readonly ChartListPick[];
  /** Скольких не хватило до заказанного объёма. Ноль — набралось полностью. */
  readonly shortfall: number;
  readonly refusal: ChartListRefusal | null;
}

export interface ChartListTuning {
  /**
   * Доля максимума расстояния сеанса, ближе которой звук считается похожим. //provisional
   * Число взято у свода БЕЗ ИЗМЕНЕНИЯ (0.05): своей измеренной точки чарт-лист не имеет, и
   * подобрать её на глаз значило бы выдать догадку за замер. Оговорка: у свода порог настроен на
   * двадцать образов ОДНОГО сеанса, а здесь до двухсот по ВСЕМУ журналу — поведение на другом
   * масштабе не проверено. Первое, что смотрим на приёмке. Провенанс — в `THRESHOLDS.md`.
   */
  readonly minDistanceRatio: number;
}

export const CHART_LIST_DEFAULTS: ChartListTuning = {
  minDistanceRatio: 0.05,
};

const refuse = (reason: ChartListRefusalReason, detail: string): ChartListRefusal => ({ reason, detail });

const byDeltaDbDesc = (a: ChartListCandidate, b: ChartListCandidate): number => b.deltaDb - a.deltaDb;

/** Ближе к портрету — ниже плоскостность: тональное и гармоническое, а не широкополосный шум. */
const byTonalityAsc = (a: ChartListCandidate, b: ChartListCandidate): number =>
  a.flatness - b.flatness || b.deltaDb - a.deltaDb;

function pickOf(c: ChartListCandidate, rank: number, displaced: number): ChartListPick {
  return {
    entryId: c.entryId,
    sampleId: c.sampleId,
    rank,
    deltaDb: c.deltaDb,
    peakDb: c.peakDb,
    structure: c.structure,
    flatness: c.flatness,
    displaced,
  };
}

/**
 * Отбор по разнообразию спектральной формы: громкие вперёд, но похожие вытесняются.
 *
 * Ось дедупа и порог — из `session-metrics`; здесь только порядок обхода и перевод индексов в
 * строки. `displaced` показывает, что отсев работал, а не молчал: ноль вытесненных на разнородном
 * материале — законный исход, а не признак поломки.
 */
function selectByVariety(
  sorted: readonly ChartListCandidate[],
  volume: number,
  tuning: ChartListTuning,
): ChartListPick[] {
  const vectors = normalizeFeatures(
    sorted.map((c) => c.features),
    sorted.map((c) => c.durationSec),
  );
  const order = sorted.map((_, i) => i);
  const { kept, droppedAs } = dedupeGreedy(vectors, order, tuning.minDistanceRatio, volume);

  const displacedBy = new Map<number, number>();
  for (const [dropped, keeper] of droppedAs) {
    void dropped;
    displacedBy.set(keeper, (displacedBy.get(keeper) ?? 0) + 1);
  }
  return kept.map((idx, rank) => pickOf(sorted[idx]!, rank + 1, displacedBy.get(idx) ?? 0));
}

/**
 * Собрать выборку.
 *
 * Отказ приходит ВМЕСТО списка, а не пустым списком: пустой список читается как «ничего не нашлось»,
 * тогда как «критерий незнаком» и «кандидатов нет» — разные события, и оператор вправе их различать.
 */
export function selectChartList(
  candidates: readonly ChartListCandidate[],
  criterion: string,
  volume: number,
  tuning: ChartListTuning = CHART_LIST_DEFAULTS,
): ChartListSelection {
  const safeCriterion = isChartListCriterion(criterion) ? criterion : 'loudness-over-floor';
  const safeVolume = isChartListVolume(volume) ? volume : 20;

  if (!isChartListCriterion(criterion)) {
    return {
      criterion: safeCriterion,
      volume: safeVolume,
      picks: [],
      shortfall: safeVolume,
      refusal: refuse('unknown-criterion', `критерий «${criterion}» вне закрытой тройки`),
    };
  }
  if (!isChartListVolume(volume)) {
    return {
      criterion: safeCriterion,
      volume: safeVolume,
      picks: [],
      shortfall: safeVolume,
      refusal: refuse('unknown-volume', `объём ${volume} вне списка 200/100/60/20`),
    };
  }
  if (candidates.length === 0) {
    return {
      criterion: safeCriterion,
      volume: safeVolume,
      picks: [],
      shortfall: safeVolume,
      refusal: refuse('no-candidates', 'измеренных кандидатов нет — отбирать не из чего'),
    };
  }

  let picks: ChartListPick[];
  if (criterion === 'spectral-variety') {
    picks = selectByVariety([...candidates].sort(byDeltaDbDesc), safeVolume, tuning);
  } else {
    const sorted = [...candidates].sort(
      criterion === 'drone-likeness' ? byTonalityAsc : byDeltaDbDesc,
    );
    picks = sorted.slice(0, safeVolume).map((c, i) => pickOf(c, i + 1, 0));
  }

  return {
    criterion,
    volume: safeVolume,
    picks,
    shortfall: shortfallOf(picks.length, safeVolume),
    refusal: null,
  };
}
