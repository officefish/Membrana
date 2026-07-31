/**
 * Замер порога немого кадра на ЖИВОМ тракте. Спринт `mfcc-plugin-sprint`, блок
 * `mfcc-plugin-math` (математик).
 *
 * ЗАЧЕМ. В пресете `minMagnitude: 0`, и это записано словами «ЗАЩИТЫ НЕТ». Калибровка порог
 * дать не может: он снимается на тишине СВОЕГО тракта, которой в корпусе из ста двадцати
 * чужих записей нет. Кадр из околонулевых коэффициентов попадёт в любой коридор, включающий
 * ноль, и труба даст зелёный на молчании. Разбор математика: «вектор близ нуля — шум
 * квантования или электроники, не информация».
 *
 * ОТКАЗ, А НЕ ИСКЛЮЧЕНИЕ. Математик просил «отказать с причиной». Отказ возвращается
 * значением: замер идёт из живого экрана, и брошенное исключение там превратилось бы либо в
 * падение прибора, либо в молчаливый `catch` — то есть в порог, о котором никто не знает,
 * что его нет.
 */
import { vectorMagnitude } from './mfccAnalyzerPlugin';

/**
 * Сколько кадров тишины нужно, чтобы черта что-то значила.
 *
 * Не круглое число ради круглости: перцентиль по трём точкам вырождается в максимум (тот же
 * урок, что записан в сателлите калибровки). Восемь — минимум, при котором хвост
 * распределения отличим от единственного выброса.
 */
export const MIN_SILENCE_FRAMES = 8;

/**
 * Запас над наблюдённой тишиной. Черта ровно по максимуму тишины означала бы, что следующий
 * такой же тихий кадр окажется судимым — граница должна лежать ВЫШЕ увиденного, а не по нему.
 */
export const SILENCE_HEADROOM = 1.2;

export interface MagnitudeSpread {
  readonly min: number;
  readonly max: number;
  readonly mean: number;
  /** Перцентиль 99 — хвост тишины, по нему и проводится черта. */
  readonly p99: number;
}

export interface MagnitudeThresholdMeasurement {
  /** Порог. `null` — замер отказан, и тогда действует пресетный, а он равен нулю. */
  readonly floor: number | null;
  /** Причина отказа. `null` — замер состоялся. */
  readonly refusal: string | null;
  readonly sampleCount: number;
  /** Что именно увидели. `null` при отказе до счёта. Нужен, чтобы порог можно было оспорить. */
  readonly observed: MagnitudeSpread | null;
}

/**
 * Перцентиль по возрастающей выборке, ближайший ранг.
 *
 * На малой выборке вырождается в максимум — это свойство, а не дефект, и оно названо здесь,
 * чтобы не было принято за точность: при восьми кадрах p99 и есть самый громкий из них.
 */
function percentile(sortedAscending: readonly number[], q: number): number {
  if (sortedAscending.length === 0) return Number.NaN;
  const index = Math.min(
    sortedAscending.length - 1,
    Math.max(0, Math.ceil(q * sortedAscending.length) - 1),
  );
  return sortedAscending[index] as number;
}

/**
 * Черта немого кадра по выборке, снятой на заведомо молчащем источнике.
 *
 * @param silentVectors кадры тишины — векторы коэффициентов, НЕ судимые результаты: на момент
 *   замера порога ещё нет, а значит нет и деления на прошедшие/немые. Судить, чтобы получить
 *   то, чем судят, было бы кругом.
 */
export function detectMagnitudeThreshold(
  silentVectors: readonly (readonly number[])[],
): MagnitudeThresholdMeasurement {
  const magnitudes = silentVectors
    .map((v) => vectorMagnitude(v))
    .filter((m) => Number.isFinite(m) && m >= 0);

  if (magnitudes.length < MIN_SILENCE_FRAMES) {
    return {
      floor: null,
      refusal:
        `кадров тишины ${magnitudes.length}, нужно не меньше ${MIN_SILENCE_FRAMES}: ` +
        'по такой выборке черта была бы одним кадром, а не порогом',
      sampleCount: magnitudes.length,
      observed: null,
    };
  }

  const sorted = [...magnitudes].sort((a, b) => a - b);
  const min = sorted[0] as number;
  const max = sorted[sorted.length - 1] as number;
  const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const observed: MagnitudeSpread = { min, max, mean, p99: percentile(sorted, 0.99) };

  // Тишина без разброса — это не тишина, а мёртвый тракт: источник не подключён, поток
  // отдаёт одно и то же значение. Провести по нему черту значило бы назвать порогом
  // отсутствие сигнала как такового.
  if (max - min <= Number.EPSILON) {
    return {
      floor: null,
      refusal:
        `все ${magnitudes.length} кадров тишины дали одну и ту же норму ${max.toFixed(6)} — ` +
        'разброса нет, тракт похож на мёртвый, а не на тихий',
      sampleCount: magnitudes.length,
      observed,
    };
  }

  return {
    floor: observed.p99 * SILENCE_HEADROOM,
    refusal: null,
    sampleCount: magnitudes.length,
    observed,
  };
}
