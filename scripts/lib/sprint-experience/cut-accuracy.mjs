/**
 * cut-accuracy — точность нарезки (автор: тимлид, сигнал БИНАРЕН).
 *
 * Мерка НЕ изобретается: блок обязан поместиться в одну проверку код-ревью. Это уже работающая
 * мерка — ревью каждый день печатает `oversized`, но задним числом, как жалобу. Здесь то же
 * число становится условием ДО работы. Одно число, другой момент.
 *
 * Порог приходит ПАРАМЕТРОМ, дефолт — импорт `OVERSIZED_CHANGED_LINES` из ревью;
 * своего порога блок не заводит и `scripts/lib/day-work-diff.mjs` не правит.
 *
 * `?? 0` и `|| 0` здесь ЗАПРЕЩЕНЫ — на это стоит зуб `no-nullish-zero-in-metrics`:
 * подстановка нуля превращает «не наблюдали» в «наблюдали ноль», то есть в ту самую
 * ложную чистоту, которую род и должен ловить.
 */
import { OVERSIZED_CHANGED_LINES } from '../day-work-diff.mjs';

import { absent, present } from './absence.mjs';
import { isLegalNo } from './forecast-record.mjs';

/** Направления промаха названы: обещал «влезет» — переполнился / объявил «не влезет» — влез. */
export const MISS_DIRECTIONS = Object.freeze(['overflow', 'over-cut']);

/** Единица объёма: изменённые строки. Не файлы, не коммиты, не токены, не «размер на глаз». */
export function changedLines({ insertions, deletions }) {
  if (!Number.isInteger(insertions) || !Number.isInteger(deletions)) {
    throw new Error('changedLines: insertions и deletions обязаны быть целыми — подстановка нуля запрещена');
  }
  return insertions + deletions;
}

/** Наблюдаемый вердикт по блоку. Порог — параметр, сравнение строгое (как в ревью). */
export function verdictFor(lines, threshold) {
  if (!Number.isInteger(lines)) throw new Error('verdictFor: changedLines не наблюдены — вердикт не выносится');
  return lines > threshold ? 'overflowed' : 'fitted';
}

/** Бинарное попадание: заявка совпала с наблюдением. */
export function isHit(claim, verdict) {
  if (claim === 'fits') return verdict === 'fitted';
  if (claim === 'does-not-fit') return verdict === 'overflowed';
  throw new Error(`isHit: claim «${String(claim)}» вне перечня`);
}

/**
 * `computeCutAccuracy(records, { threshold })` — чистая функция. Без сети, без git, без часов.
 *
 * @param {readonly object[]} records записи рода (фильтруются по subject === 'cut')
 * @param {{ threshold?: number }} [opts] порог одной проверки ревью
 * @returns {{defined:true,value:number,numerator:number,denominator:number,pair:object}
 *          |{defined:false,reason:string}}
 */
export function computeCutAccuracy(records, opts = {}) {
  const threshold = Number.isInteger(opts.threshold) ? opts.threshold : OVERSIZED_CHANGED_LINES;
  const cuts = (Array.isArray(records) ? records : []).filter((r) => r.subject === 'cut');
  if (cuts.length === 0) return absent('no-cut-forecast');

  // Нератифицированное предсказание в мерку не входит — иначе доля молча считается
  // по неполному множеству, а причина этого не видна в выводе.
  const ratified = cuts.filter((r) => r.ratifiedBy === 'owner');
  if (ratified.length === 0) return absent('forecast-not-ratified');

  let blocksCount = 0;
  let withoutOutcome = 0;
  let unattributed = 0;
  let hits = 0;
  let observedTotal = 0;
  let overflowed = 0;
  const missDirections = { overflow: 0, 'over-cut': 0 };

  for (const rec of ratified) {
    const predictedBlocks = rec.predicted.blocks;
    blocksCount += predictedBlocks.length;
    const observedByBlock = observedIndex(rec);
    for (const block of predictedBlocks) {
      if (observedByBlock === null) { withoutOutcome += 1; continue; }
      const seen = observedByBlock.get(block.cutBlockId);
      if (seen === undefined) { unattributed += 1; withoutOutcome += 1; continue; }
      const verdict = verdictFor(seen, threshold);
      observedTotal += 1;
      if (verdict === 'overflowed') overflowed += 1;
      if (isHit(block.claim, verdict)) hits += 1;
      else if (block.claim === 'fits') missDirections.overflow += 1;
      else missDirections['over-cut'] += 1;
    }
  }

  if (observedTotal === 0) {
    // Отсутствие привязки — отдельная причина, а не «ревью не дошло»: сегменты приехали,
    // но сопоставить их с блоком нельзя, и по путям файлов блок не угадывает.
    return absent(unattributed > 0 ? 'no-attribution' : 'no-observed-outcome');
  }

  return present({
    value: hits / observedTotal,
    numerator: hits,
    denominator: observedTotal,
    pair: {
      // Обязательные пары против Гудхарта: доля в одиночку скрывает «резал на один блок»
      // и «объявил всё „не влезет“ и всегда попадал».
      blocksCount,
      overflowRate: { value: overflowed / observedTotal, numerator: overflowed, denominator: observedTotal },
      withoutOutcome,
      unattributed,
      missOverflow: missDirections.overflow,
      missOverCut: missDirections['over-cut'],
    },
  });
}

/**
 * Индекс `cutBlockId → changedLines` по исходу записи.
 * `null` — исхода нет вовсе (легальное «нет»), это НЕ пустой индекс.
 */
function observedIndex(rec) {
  const o = rec.observed;
  if (o === undefined || isLegalNo(o)) return null;
  const map = new Map();
  for (const b of o.blocks) {
    if (typeof b.cutBlockId === 'string' && Number.isInteger(b.changedLines)) {
      map.set(b.cutBlockId, b.changedLines);
    }
  }
  return map;
}

/** Строка «без исхода: k» — без неё промах прячется в «ещё не доехало до ревью». */
export function renderWithoutOutcome(metric) {
  if (metric.defined === false) return '';
  return `без исхода: ${metric.pair.withoutOutcome} (из них без привязки: ${metric.pair.unattributed})`;
}
