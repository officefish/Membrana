/**
 * Чистая математика калибровки ворот тембрового детектора. Ни файлов, ни библиотеки —
 * считалка инъектируется вызывающим, кадрирование и чтение звука живут в CLI.
 *
 * Вынесено из `scripts/calibrate-mfcc-gates.mjs` по ревью 31.07 (P2): функции переиспользуемы
 * и обязаны иметь зубы — граничные случаи здесь не редкость, а норма живого корпуса.
 */

/**
 * Перцентиль по УЖЕ отсортированному массиву. Пустой вход — `null`, а не `NaN`: `NaN`
 * протекает дальше молча и всплывает в отчёте числом, которого никто не считал.
 *
 * @param {readonly number[]} sorted
 * @param {number} pct 0..100
 * @returns {number|null}
 */
export function percentile(sorted, pct) {
  if (!Array.isArray(sorted) || sorted.length === 0) return null;
  if (!Number.isFinite(pct)) return null;
  const p = Math.min(100, Math.max(0, pct));
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

/**
 * Кадрирование сигнала без перекрытия. Хвост короче кадра ОТБРАСЫВАЕТСЯ: неполный кадр дал бы
 * вектор, посчитанный на другом числе сэмплов, и он несравним с остальными.
 *
 * Кадрирование — предмет вызывающего, не ядра (граница пакета `mfcc-analyzer`).
 *
 * @param {Float32Array} samples
 * @param {number} bufferSize
 * @returns {Generator<Float32Array>}
 */
export function* frames(samples, bufferSize) {
  if (!samples || !Number.isInteger(bufferSize) || bufferSize < 2) return;
  for (let i = 0; i + bufferSize <= samples.length; i += bufferSize) {
    yield samples.subarray(i, i + bufferSize);
  }
}

/**
 * Ворота одного коэффициента и его разделяющая сила.
 *
 * Ворота берутся ПЕРЦЕНТИЛЯМИ по классу цели, а не крайними значениями: один выброс раздвинул
 * бы коридор до бессмысленного. Разделяющая сила — насколько РЕЖЕ фон попадает в ворота цели;
 * полезен не тот коэффициент, у кого красивое число, а тот, в чьи ворота фон не заходит.
 *
 * Пустой класс фона даёт `separation: null` и причину — не ноль: «фон не попадает ни разу» и
 * «фона не было» разные вещи, и слить их значит соврать в пользу коэффициента.
 *
 * @param {readonly number[]} droneValues
 * @param {readonly number[]} otherValues
 * @param {{lo?: number, hi?: number}} [pct]
 */
export function coefficientGate(droneValues, otherValues, pct = {}) {
  const lo = pct.lo ?? 5;
  const hi = pct.hi ?? 95;
  const d = [...(droneValues ?? [])].filter(Number.isFinite).sort((a, b) => a - b);
  if (d.length === 0) {
    return { gate: null, droneInside: null, otherInside: null, separation: null, why: 'класс цели пуст' };
  }
  const gLo = percentile(d, lo);
  const gHi = percentile(d, hi);
  const inside = (v) => v >= gLo && v <= gHi;
  const droneInside = d.filter(inside).length / d.length;
  const o = (otherValues ?? []).filter(Number.isFinite);
  if (o.length === 0) {
    return {
      gate: { lo: gLo, hi: gHi },
      droneInside,
      otherInside: null,
      separation: null,
      why: 'класс фона пуст — разделяющая сила НЕ определена (не ноль)',
    };
  }
  const otherInside = o.filter(inside).length / o.length;
  return { gate: { lo: gLo, hi: gHi }, droneInside, otherInside, separation: droneInside - otherInside, why: null };
}
