/**
 * Зубы КОНТРАКТА ПОРЯДКА массового вывоза проб из буфера в набор. Предмет — чистая функция
 * `planMoveBatch` вместе с `tallyMoveBatch`; базы и Nest здесь нет намеренно: правило «какие
 * именно 70% уедут» обязано быть проверяемо без прибора и без прода.
 *
 * ПОРЧИ → КРАСНЫЙ (проверено руками, каждая по отдельности):
 *   1. убрать второй ключ сортировки (`|| sampleId`) — «порядок при равном времени» падает:
 *      на равных метках времени порядок становится порядком входа, и два прогона получают
 *      право разойтись;
 *   2. развернуть сортировку на `b.createdAtMs - a.createdAtMs` — «старейшие первыми» падает;
 *   3. выбросить `axisRefuses` (везти всё) — падают «ось не переполняется» и «частичный
 *      перенос называет оставшихся»;
 *   4. заменить `continue` на `break` в отборе (остановиться на первой не влезшей) —
 *      «не влезшая проба не запирает очередь» падает;
 *   5. пропускать не-из-буфера молча (`continue` без `stayed.push`) — «not-in-buffer поимённо»
 *      падает: число `willStay` перестаёт сходиться со списком;
 *   6. считать `not-found` нулём байт в `stayBytes` — уже так и есть, но если вес такой пробы
 *      выдумать (например брать `0` как известный), падает «stayBytes считает только
 *      известные веса»;
 *   7. не отбрасывать дубликат адреса — «повтор адреса считается один раз» падает.
 */
import { describe, expect, it } from 'vitest';

import {
  MAX_MOVE_BATCH_SAMPLES,
  planMoveBatch,
  tallyMoveBatch,
  type MoveBatchRow,
} from './move-batch-plan';

const AXIS = { usedBytes: 0, limitBytes: 1_000 };

function row(
  sampleId: string,
  createdAtMs: number,
  sizeBytes = 100,
  inBuffer = true,
): MoveBatchRow {
  return { sampleId, createdAtMs, sizeBytes, inBuffer };
}

function rowsOf(...list: readonly MoveBatchRow[]): Map<string, MoveBatchRow> {
  return new Map(list.map((r) => [r.sampleId, r]));
}

describe('planMoveBatch — порядок переноса', () => {
  it('старейшие первыми: порядок переноса не порядок заказа', () => {
    const rows = rowsOf(row('c', 300), row('a', 100), row('b', 200));

    const plan = planMoveBatch({ requested: ['c', 'a', 'b'], rows, targetAxis: AXIS });

    expect(plan.moveIds).toEqual(['a', 'b', 'c']);
  });

  it('при равном времени решает адрес — сортировка определена на любых входах', () => {
    // Очереди записи дают совпадающие метки времени; без второго ключа порядок неопределён.
    const rows = rowsOf(row('sample-b', 500), row('sample-a', 500), row('sample-c', 500));

    const fromOneOrder = planMoveBatch({
      requested: ['sample-c', 'sample-a', 'sample-b'],
      rows,
      targetAxis: AXIS,
    });
    const fromAnother = planMoveBatch({
      requested: ['sample-b', 'sample-c', 'sample-a'],
      rows,
      targetAxis: AXIS,
    });

    expect(fromOneOrder.moveIds).toEqual(['sample-a', 'sample-b', 'sample-c']);
    expect(fromAnother.moveIds).toEqual(fromOneOrder.moveIds);
  });

  it('одно множество на два прогона при неизменном состоянии', () => {
    const rows = rowsOf(row('a', 1), row('b', 2), row('c', 3), row('d', 4));
    const axis = { usedBytes: 700, limitBytes: 1_000 };
    const requested = ['d', 'b', 'c', 'a'];

    const first = planMoveBatch({ requested, rows, targetAxis: axis });
    const second = planMoveBatch({ requested, rows, targetAxis: axis });

    expect(second).toEqual(first);
    expect(first.moveIds).toEqual(['a', 'b', 'c']);
  });
});

describe('planMoveBatch — место', () => {
  it('частичный перенос называет оставшихся поимённо, а не только числом', () => {
    const rows = rowsOf(row('a', 1), row('b', 2), row('c', 3), row('d', 4));

    const plan = planMoveBatch({
      requested: ['a', 'b', 'c', 'd'],
      rows,
      // 300 байт свободно — влезают три пробы по 100.
      targetAxis: { usedBytes: 700, limitBytes: 1_000 },
    });

    expect(plan.moveIds).toEqual(['a', 'b', 'c']);
    expect(plan.stayed).toEqual([{ sampleId: 'd', reason: 'no-space' }]);
    expect(plan.plan).toEqual({ willMove: 3, willStay: 1, moveBytes: 300, stayBytes: 100 });
  });

  it('ось не переполняется: сумма перенесённого + занятое не больше лимита', () => {
    const rows = rowsOf(
      row('a', 1, 300),
      row('b', 2, 300),
      row('c', 3, 300),
      row('d', 4, 300),
    );

    const plan = planMoveBatch({
      requested: ['a', 'b', 'c', 'd'],
      rows,
      targetAxis: { usedBytes: 100, limitBytes: 1_000 },
    });

    expect(100 + plan.plan.moveBytes).toBeLessThanOrEqual(1_000);
    expect(plan.moveIds).toEqual(['a', 'b', 'c']);
  });

  it('не влезшая проба не запирает очередь: следующая, поменьше, едет', () => {
    const rows = rowsOf(
      row('big-oldest', 1, 400),
      row('small-newer', 2, 100),
      row('small-newest', 3, 100),
    );

    const plan = planMoveBatch({
      requested: ['big-oldest', 'small-newer', 'small-newest'],
      rows,
      // 200 байт свободно: крупная старейшая не влезает, две мелкие — влезают.
      targetAxis: { usedBytes: 800, limitBytes: 1_000 },
    });

    expect(plan.moveIds).toEqual(['small-newer', 'small-newest']);
    expect(plan.stayed).toEqual([{ sampleId: 'big-oldest', reason: 'no-space' }]);
    expect(plan.plan.moveBytes).toBe(200);
  });

  it('ось забита под край — не едет никто, и это 0, а не отказ', () => {
    const rows = rowsOf(row('a', 1), row('b', 2));

    const plan = planMoveBatch({
      requested: ['a', 'b'],
      rows,
      targetAxis: { usedBytes: 1_000, limitBytes: 1_000 },
    });

    expect(plan.moveIds).toEqual([]);
    expect(plan.plan).toEqual({ willMove: 0, willStay: 2, moveBytes: 0, stayBytes: 200 });
  });
});

describe('planMoveBatch — словарь причин', () => {
  it('не из буфера попадает в stayed поимённо, а не пропускается молча', () => {
    const rows = rowsOf(row('in-buffer', 1), row('already-out', 2, 100, false));

    const plan = planMoveBatch({
      requested: ['in-buffer', 'already-out'],
      rows,
      targetAxis: AXIS,
    });

    expect(plan.moveIds).toEqual(['in-buffer']);
    expect(plan.stayed).toEqual([{ sampleId: 'already-out', reason: 'not-in-buffer' }]);
    expect(plan.plan.willStay).toBe(plan.stayed.length);
  });

  it('незнакомый адрес — not-found, и его вес в stayBytes не выдумывается', () => {
    const rows = rowsOf(row('known', 1));

    const plan = planMoveBatch({ requested: ['ghost', 'known'], rows, targetAxis: AXIS });

    expect(plan.stayed).toEqual([{ sampleId: 'ghost', reason: 'not-found' }]);
    expect(plan.plan).toEqual({ willMove: 1, willStay: 1, moveBytes: 100, stayBytes: 0 });
  });

  it('повтор адреса в заказе считается один раз', () => {
    const rows = rowsOf(row('a', 1));

    const plan = planMoveBatch({ requested: ['a', 'a', 'a'], rows, targetAxis: AXIS });

    expect(plan.moveIds).toEqual(['a']);
    expect(plan.plan).toEqual({ willMove: 1, willStay: 0, moveBytes: 100, stayBytes: 0 });
  });

  it('порядок stayed детерминирован: сперва заказ, затем очередь переноса', () => {
    const rows = rowsOf(
      row('out', 1, 100, false),
      row('old', 2, 900),
      row('new', 3, 900),
    );

    const plan = planMoveBatch({
      requested: ['new', 'out', 'old'],
      rows,
      targetAxis: { usedBytes: 200, limitBytes: 1_000 },
    });

    expect(plan.moveIds).toEqual([]);
    expect(plan.stayed).toEqual([
      { sampleId: 'out', reason: 'not-in-buffer' },
      { sampleId: 'old', reason: 'no-space' },
      { sampleId: 'new', reason: 'no-space' },
    ]);
  });
});

describe('tallyMoveBatch', () => {
  it('одна арифметика на план и на итог', () => {
    const rows = rowsOf(row('a', 1, 10), row('b', 2, 20), row('c', 3, 30));

    const plan = planMoveBatch({ requested: ['a', 'b', 'c'], rows, targetAxis: AXIS });
    const tally = tallyMoveBatch(plan.moveIds, plan.stayed, rows);

    expect(tally).toEqual(plan.plan);
    expect(tally.moveBytes).toBe(60);
  });
});

describe('потолок пачки', () => {
  it('объявлен числом выше живого буфера прибора 9e86ec85 (1057 проб)', () => {
    expect(MAX_MOVE_BATCH_SAMPLES).toBeGreaterThan(1_057);
  });
});
