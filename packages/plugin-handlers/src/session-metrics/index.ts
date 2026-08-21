/**
 * Меры разбора сеанса — блок j1 спринта `journal-session-twenty` (#1961), персона Дынин.
 *
 * ЧИСТО: ни файлов, ни сети, ни часов. Вход — значения (кадры уже декодированы вызывающим),
 * выход — числа и отказы с причиной. Кадрирование и чтение звука живут в исполнителе (j2).
 *
 * СВОИХ КОПИЙ ФОРМУЛ НЕТ. Все меры берутся из `@membrana/fft-analyzer-service`, где они
 * уже живут и покрыты зубами: `frameLoudness`, `estimateNoiseFloor`, `spectralCentroid`,
 * `spectralRolloff`, `spectralFlatness`, `zeroCrossingRate`, `spectralFluxL2`. Скопировать
 * их сюда значило бы завести второй носитель одной величины — ровно то, от чего репозиторий
 * лечился всё лето.
 *
 * ТРИ ТРЕБОВАНИЯ ВЛАДЕЛЬЦА (21.08), каждое — отдельная функция ниже:
 *  1. громкость ОТНОСИТЕЛЬНАЯ: `dbOverFloor` — пик события над фоном СЕАНСА, дБ. Абсолютного
 *     порога здесь нет и быть не может: он уехал бы от усиления и помещения;
 *  2. отсев похожего: `dedupeGreedy` — двадцать РАЗНЫХ, а не двадцать кусков одного хлопка;
 *  3. шум против структуры: `structureOf` — плоскостность спектра решает, тон это или шум.
 *
 * ПОРОГИ ЗДЕСЬ НЕ НАЗНАЧАЮТСЯ — они приходят параметрами, а числа им называет СЛУХ по замеру
 * (Курёхин). `deltaDb` и `minDistanceRatio` — доли и децибелы сеанса; `flatnessCeiling` —
 * абсолют, и почему именно абсолют, сказано у `DEFAULT_FLATNESS_CEILING`: часовой сеанс
 * 21.08 показал провал между классами, которого квантиль не видит.
 */
import {
  estimateNoiseFloor,
  frameLoudness,
  spectralCentroid,
  spectralFlatness,
  spectralFluxL2,
  spectralRolloff,
  zeroCrossingRate,
} from '@membrana/fft-analyzer-service';

/** Кадровая огибающая громкости. `frameLoudness`, а не `rms`: RMS сглаживает пики, а событие — это пик. */
export function loudnessEnvelope(samples: Float32Array, frameSize: number): Float32Array {
  if (frameSize < 2 || samples.length < frameSize) return new Float32Array(0);
  const count = Math.floor(samples.length / frameSize);
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = frameLoudness(samples.subarray(i * frameSize, (i + 1) * frameSize));
  }
  return out;
}

/**
 * Фон сеанса — по кадрам ВСЕХ треков подряд, а не по трекам: усреднение внутри трека убило бы
 * тихие кадры, из которых фон и состоит. Носитель — `estimateNoiseFloor` (нижние 10 % истории).
 *
 * `floorIsFallback` — не украшение: при истории короче 20 значений носитель возвращает
 * литерал 0.01, и это «фон не измерен», а не «фон такой». Признак едет в отчёт, чтобы
 * измеренное не подменялось объявленным (#1950).
 */
export function sessionFloor(frameLoudnessHistory: readonly number[]): {
  floor: number;
  floorIsFallback: boolean;
} {
  return {
    floor: estimateNoiseFloor(frameLoudnessHistory),
    floorIsFallback: frameLoudnessHistory.length < 20,
  };
}

/** Превышение над фоном в дБ: `20·log10(peak/floor)`. Отношение нелинейно к усилению — потому дБ. */
export function dbOverFloor(peak: number, floor: number): number {
  if (!(peak > 0) || !(floor > 0)) return Number.NEGATIVE_INFINITY;
  return 20 * Math.log10(peak / floor);
}

/** Событие внутри трека: адрес — точка во времени, а не «весь трек». */
export interface SessionEvent {
  readonly startSec: number;
  readonly endSec: number;
  readonly peak: number;
  readonly peakDb: number;
  readonly startFrame: number;
  readonly frameCount: number;
}

/**
 * Границы событий по кадровой огибающей. Порог — от фона (`floor · 10^(deltaDb/20)`), не абсолютный.
 *
 * Одиночный кадр над порогом событием НЕ считается: щелчок оцифровки и настоящий хлопок
 * различаются длительностью, и пропускать первый значило бы набрать двадцать артефактов.
 */
export function findEvents(
  envelope: Float32Array,
  floor: number,
  deltaDb: number,
  frameSize: number,
  sampleRate: number,
): SessionEvent[] {
  const threshold = floor * 10 ** (deltaDb / 20);
  const secPerFrame = frameSize / sampleRate;
  const out: SessionEvent[] = [];
  let start = -1;
  let peak = 0;
  for (let i = 0; i <= envelope.length; i++) {
    const loud = i < envelope.length && envelope[i]! > threshold;
    if (loud) {
      if (start === -1) start = i;
      peak = Math.max(peak, envelope[i]!);
      continue;
    }
    if (start !== -1) {
      const frames = i - start;
      // Событие длиной в один кадр отбрасывается — см. головной комментарий функции.
      if (frames >= 2) {
        out.push({
          startSec: start * secPerFrame,
          endSec: i * secPerFrame,
          peak,
          peakDb: dbOverFloor(peak, floor),
          startFrame: start,
          frameCount: frames,
        });
      }
      start = -1;
      peak = 0;
    }
  }
  return out;
}

/**
 * Признаки события. Первые четыре — оси похожести (дедуп), `flatness` и `flux` — ещё и оси
 * различения шума и структуры: плоскостность говорит «тон или шум», поток — «случилось ли
 * событие вообще». Это два РАЗНЫХ предмета, и смешивать их в один балл нельзя.
 */
export interface EventFeatures {
  readonly centroidHz: number;
  readonly rolloffHz: number;
  readonly flatness: number;
  readonly zeroCrossingRate: number;
  readonly flux: number;
}

export function featuresOf(
  magnitudes: Float32Array,
  frequencies: Float32Array,
  samples: Float32Array,
  previousMagnitudes: Float32Array | null,
): EventFeatures {
  return {
    centroidHz: spectralCentroid(magnitudes, frequencies),
    rolloffHz: spectralRolloff(magnitudes, frequencies),
    flatness: spectralFlatness(magnitudes),
    zeroCrossingRate: zeroCrossingRate(samples),
    flux: previousMagnitudes === null ? 0 : spectralFluxL2(magnitudes, previousMagnitudes),
  };
}

/**
 * Спектральные оси дедупа. `flux` в них НЕ входит: он про «было событие», а не про «какой это
 * звук». Пятая ось — ДЛИТЕЛЬНОСТЬ всплеска — приходит отдельно (см. `normalizeFeatures`):
 * она свойство события, а не кадра, и `featuresOf` её не считает.
 */
const DEDUPE_AXES = ['centroidHz', 'rolloffHz', 'flatness', 'zeroCrossingRate'] as const;

/**
 * Нормировка по диапазону СЕАНСА, а не по абсолютной шкале: центроида в герцах и
 * плоскостность в долях иначе несопоставимы, и евклид считал бы расстояние по одной оси.
 * Вырожденная ось (все значения равны) даёт нули — она про эти события ничего не говорит.
 *
 * ДЛИТЕЛЬНОСТЬ — пятая ось, и аргумент ОБЯЗАТЕЛЕН: короткий щелчок и долгий гул одного
 * тембра — разные звуки, и без этой оси дедуп схлопнул бы их в один (нарезка j1 называла
 * длительность всплеска в векторе признаков; поймано ревью PR #2040). Обязательность —
 * не строгость ради строгости: необязательный аргумент означал бы «можно забыть», а забытая
 * ось молча меняет состав двадцати.
 */
export function normalizeFeatures(
  features: readonly EventFeatures[],
  durationsSec: readonly number[],
): number[][] {
  if (features.length === 0) return [];
  if (durationsSec.length !== features.length) {
    throw new Error(
      `normalizeFeatures: длительностей ${durationsSec.length} ≠ событий ${features.length} — ось дедупа неполна`,
    );
  }
  const columns: number[][] = [
    ...DEDUPE_AXES.map((axis) => features.map((f) => f[axis])),
    [...durationsSec],
  ];
  const ranges = columns.map((values) => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { min, span: max - min };
  });
  return features.map((_, row) =>
    columns.map((values, col) => {
      const { min, span } = ranges[col]!;
      return span === 0 ? 0 : (values[row]! - min) / span;
    }),
  );
}

export function euclidean(a: readonly number[], b: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i]! - b[i]!) ** 2;
  return Math.sqrt(sum);
}

/**
 * Жадный отсев похожего: берём громчайшего, выбрасываем всех ближе порога, повторяем.
 * Кластеризация для двадцати из семисот избыточна — и она потребовала бы выбирать число
 * кластеров, то есть тот же порог, только спрятанный.
 *
 * `minDistanceRatio` — доля от МАКСИМАЛЬНОГО расстояния в сеансе: порог живёт в единицах
 * этого сеанса, а не в выдуманных абсолютных.
 *
 * @param order индексы кандидатов, уже отсортированные по убыванию громкости
 */
export function dedupeGreedy(
  vectors: readonly (readonly number[])[],
  order: readonly number[],
  minDistanceRatio: number,
  limit: number,
): { kept: number[]; droppedAs: Map<number, number> } {
  const kept: number[] = [];
  const droppedAs = new Map<number, number>();
  let maxDist = 0;
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      maxDist = Math.max(maxDist, euclidean(vectors[i]!, vectors[j]!));
    }
  }
  const threshold = maxDist * minDistanceRatio;
  for (const idx of order) {
    if (kept.length >= limit) break;
    if (droppedAs.has(idx)) continue;
    kept.push(idx);
    for (const other of order) {
      if (other === idx || droppedAs.has(other) || kept.includes(other)) continue;
      // НЕ ДАЛЬШЕ порога, а не «строго ближе». Разница видна на вырожденном сеансе: когда все
      // кандидаты — копии одного хлопка, максимум расстояний равен нулю, порог тоже, и строгое
      // сравнение не выбросило бы НИКОГО — двадцать кусков одного звука прошли бы в отбор.
      // Поймано зубом соседнего блока (j2) на восьми клонах, не рассуждением.
      if (euclidean(vectors[idx]!, vectors[other]!) <= threshold) droppedAs.set(other, idx);
    }
  }
  return { kept, droppedAs };
}

/** Ярлык события: тональное — опорный образ, широкополосное — негативный материал, не мусор. */
export type EventStructure = 'tonal' | 'broadband';

/**
 * Граница «шум/структура» — АБСОЛЮТ, и это исправление, а не вкус.
 *
 * До 21.08 здесь стоял квантиль сеанса, и рассуждение было такое: «в тихой комнате и на улице
 * абсолютная граница означала бы разное». Часовой сеанс (670 треков) рассуждение ОПРОВЕРГ:
 * плоскостность легла двумя кучами с провалом между ними — тональные 0.027…0.150,
 * широкополосные 0.155…0.361. Это физическая дыра между классами звука, а не срез по
 * распределению; квантиль же делит выборку ПО КОЛИЧЕСТВУ и на сеансе из одних шагов честно
 * объявил бы половину шагов «тональными».
 *
 * Слух Курёхина на этом распределении назвал число: 0.15. Оно параметр, не константа —
 * другой тракт назовёт другое, но назовёт его СЛУХОМ по замеру, а не арифметикой квантиля.
 *
 * Квантиль удалён целиком, а не оставлен запасным путём: два механизма границы на одном стыке
 * это два источника истины (разбор резчика 21.08).
 */
export const DEFAULT_FLATNESS_CEILING = 0.15;

/** Не выше потолка — тон; выше — шум. Ровно на потолке событие ТОНАЛЬНОЕ (0.150 при 0.15). */
export function structureOf(flatness: number, flatnessCeiling: number): EventStructure {
  return flatness <= flatnessCeiling ? 'tonal' : 'broadband';
}

/**
 * Индексы событий одного рода — подмножество, из которого потом отбирают. Порядок входа
 * сохраняется: отбор идёт по громкости, и перетасовать его здесь значило бы решить за отбор.
 *
 * Кого класть в опорные, а кого в негатив, решает НЕ этот блок (граница владения, разбор
 * резчика 21.08): здесь только классификатор.
 */
export function indicesByStructure(
  flatnessValues: readonly number[],
  flatnessCeiling: number,
  structure: EventStructure,
): number[] {
  const out: number[] = [];
  for (let i = 0; i < flatnessValues.length; i++) {
    const flatness = flatnessValues[i]!;
    // Не-конечное значение НЕ относится ни к одному роду: «не посчиталось» — это не «шум».
    // Молчаливое `NaN <= ceiling === false` отправило бы такое событие в негатив как факт.
    if (!Number.isFinite(flatness)) continue;
    if (structureOf(flatness, flatnessCeiling) === structure) out.push(i);
  }
  return out;
}

/** Отказ — с причиной и именем; молчаливый ноль запрещён. */
export type SessionRefusalReason =
  | 'session-too-short'
  | 'floor-not-measured'
  | 'no-events-over-floor';

export interface SessionRefusal {
  readonly ok: false;
  readonly reason: SessionRefusalReason;
  readonly detail: string;
}

export const refuseSession = (reason: SessionRefusalReason, detail: string): SessionRefusal => ({
  ok: false,
  reason,
  detail,
});

/**
 * Недобор — НЕ отказ: двадцати опорных может не найтись, и это факт о сеансе, а не сбой
 * прибора. Отдаём сколько есть и называем недостачу числом.
 */
export function shortfallOf(kept: number, limit: number): number {
  return Math.max(0, limit - kept);
}
