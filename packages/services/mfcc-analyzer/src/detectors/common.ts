/**
 * Общая часть детекторов над MFCC-ядром. Труба и тренд — **один паттерн с разными коллбеками**
 * (вердикт тимлида по нарезке блока `mfcc-detectors`): корпус векторов проверяется одинаково,
 * а различается только судья.
 *
 * Что здесь НЕ живёт: часов нет вовсе. Кадр адресуется `windowStartIndex`, а не отметкой
 * времени, поэтому ни `Date.now()`, ни `Math.random()` детекторам не нужны — детерминизм тут
 * не дисциплина, а свойство контракта ядра.
 */
import type { MfccVector } from '../types.js';

/** Отказ — легальное «нет с причиной». Не бросок, не пустой отчёт, не `detected:false`. */
export interface DetectorRefusal {
  readonly ok: false;
  readonly reason: string;
}

export type DetectorOutcome<T> =
  | { readonly ok: true; readonly report: T }
  | DetectorRefusal;

export function refuse(reason: string): DetectorRefusal {
  return { ok: false, reason };
}

/** Коридор по одному коэффициенту. Границы включительные. */
export interface Bounds {
  readonly min: number;
  readonly max: number;
}

/** Проверенный корпус: однороден по отпечатку и по длине вектора. */
export interface VectorRun {
  readonly vectors: readonly MfccVector[];
  readonly configHash: string;
  readonly coefficientCount: number;
}

export interface RunDemand {
  /** Минимум векторов, ниже которого судить нечего (отказ, а не «стабильно»). */
  readonly minCount: number;
  /**
   * Отпечаток, к которому привязан судья (коридор трубы снимался при этих настройках).
   * `null` — судье всё равно, но однородность корпуса всё равно обязательна.
   */
  readonly expectedConfigHash: string | null;
}

/**
 * Единственное место, где проверяется пригодность корпуса. Возвращает причину отказа или `null`.
 *
 * Несравнимость векторов с разными `configHash` ловится ЗДЕСЬ, а не у вызывающего: вызывающий
 * может смешать отпечатки молча (например, склеив два прогона), и тогда усреднение пройдёт по
 * несопоставимым величинам без единого признака в выходе.
 */
export function corpusProblem(
  vectors: readonly MfccVector[],
  demand: RunDemand,
): string | null {
  if (vectors.length === 0) return 'корпус пуст: судить нечего';
  if (!Number.isInteger(demand.minCount) || demand.minCount < 1) {
    return `minCount=${String(demand.minCount)} — не целое ≥ 1`;
  }
  if (vectors.length < demand.minCount) {
    return `векторов ${vectors.length} < требуемых ${demand.minCount}`;
  }

  const head = vectors[0]!;
  const coefficientCount = head.coefficients.length;
  if (coefficientCount === 0) return 'вектор без коэффициентов';

  for (let i = 0; i < vectors.length; i++) {
    const v = vectors[i]!;
    if (v.configHash !== head.configHash) {
      return `смешаны отпечатки настроек: «${head.configHash}» и «${v.configHash}» (индекс ${i}) — такие векторы несравнимы`;
    }
    if (v.coefficients.length !== coefficientCount) {
      return `длина вектора ${v.coefficients.length} ≠ ${coefficientCount} (индекс ${i})`;
    }
    if (i > 0 && v.windowStartIndex <= vectors[i - 1]!.windowStartIndex) {
      // Порядок несущий: тренд читает старшую половину как «раньше». Перемешанный корпус
      // дал бы вердикт о направлении там, где направления нет.
      return `корпус не упорядочен во времени: windowStartIndex ${v.windowStartIndex} после ${vectors[i - 1]!.windowStartIndex} (индекс ${i})`;
    }
  }

  if (demand.expectedConfigHash !== null && demand.expectedConfigHash !== head.configHash) {
    return `корпус посчитан настройками «${head.configHash}», а судья снят при «${demand.expectedConfigHash}» — несравнимо`;
  }
  return null;
}

/**
 * Общий паттерн: проверить корпус, затем отдать его судье. Труба и тренд отличаются
 * ТОЛЬКО телом `judge` — отсюда «один блок» вместо двух.
 */
export function judgeRun<T>(
  vectors: readonly MfccVector[],
  demand: RunDemand,
  judge: (run: VectorRun) => DetectorOutcome<T>,
): DetectorOutcome<T> {
  const problem = corpusProblem(vectors, demand);
  if (problem !== null) return refuse(problem);
  const head = vectors[0]!;
  return judge({
    vectors,
    configHash: head.configHash,
    coefficientCount: head.coefficients.length,
  });
}

/** Евклидова норма вектора — мера «сколько его вообще есть». */
export function magnitudeOf(coefficients: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < coefficients.length; i++) {
    const c = coefficients[i]!;
    sum += c * c;
  }
  return Math.sqrt(sum);
}

/** Покоэффициентное среднее по срезу `[from, to)`. Пустой срез → нули. */
export function meanOf(
  vectors: readonly MfccVector[],
  from: number,
  to: number,
  coefficientCount: number,
): Float32Array {
  const out = new Float32Array(coefficientCount);
  const count = to - from;
  if (count <= 0) return out;
  for (let i = from; i < to; i++) {
    const c = vectors[i]!.coefficients;
    for (let k = 0; k < coefficientCount; k++) {
      out[k] = out[k]! + c[k]!;
    }
  }
  for (let k = 0; k < coefficientCount; k++) {
    out[k] = out[k]! / count;
  }
  return out;
}

/**
 * Косинус между векторами. `null`, если хоть один вырожден (нулевая норма): «похожесть на
 * ничто» не определена, и возвращать 0 или 1 значило бы выдумать вердикт.
 */
export function cosineOf(a: Float32Array, b: Float32Array): number | null {
  const na = magnitudeOf(a);
  const nb = magnitudeOf(b);
  if (na === 0 || nb === 0) return null;
  let dot = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
  }
  const raw = dot / (na * nb);
  // Арифметика с плавающей точкой умеет вылезти за [-1, 1] на десятые доли ULP.
  return raw > 1 ? 1 : raw < -1 ? -1 : raw;
}

export function inBounds(value: number, bounds: Bounds): boolean {
  return value >= bounds.min && value <= bounds.max;
}

/** Границы годны, если конечны и не вывернуты. */
export function boundsProblem(bounds: readonly Bounds[], expectedLength: number): string | null {
  if (bounds.length !== expectedLength) {
    return `коридоров ${bounds.length} ≠ коэффициентов ${expectedLength}`;
  }
  for (let i = 0; i < bounds.length; i++) {
    const b = bounds[i]!;
    if (!Number.isFinite(b.min) || !Number.isFinite(b.max)) {
      return `коридор ${i}: границы не конечны`;
    }
    if (b.min > b.max) return `коридор ${i}: min=${b.min} > max=${b.max}`;
  }
  return null;
}

/** Доля в [0, 1] — общая проверка для всех порогов-долей. */
export function ratioProblem(name: string, value: number): string | null {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return `${name}=${String(value)} — не доля в [0, 1]`;
  }
  return null;
}
