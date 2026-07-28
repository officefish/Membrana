/**
 * Зуб тетради капитана (M6): append-only, один флаг uttered, счётчики — факт.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { foldNotebook, notebookCounts, notebookRel } from './captain-notebook.mjs';

test('append + mark_uttered сворачиваются; повторный uttered идемпотентен', () => {
  const state = foldNotebook([
    { verb: 'append', id: 'o1', body: 'мысль', sessionId: 's', at: 'T1' },
    { verb: 'uttered', id: 'o1', at: 'T2' },
    { verb: 'uttered', id: 'o1', at: 'T3' },
  ]);
  assert.equal(state.get('o1').uttered, true);
  assert.equal(state.get('o1').utteredAt, 'T2');
});

test('id не переписывается задним числом (append-only)', () => {
  const state = foldNotebook([
    { verb: 'append', id: 'o1', body: 'первая', at: 'T1' },
    { verb: 'append', id: 'o1', body: 'подмена', at: 'T2' },
  ]);
  assert.equal(state.get('o1').body, 'первая');
});

test('пустое body не рождает запись; пустая тетрадь — честный ноль, не ошибка', () => {
  const state = foldNotebook([{ verb: 'append', id: 'o1', body: '  ', at: 'T' }]);
  assert.deepEqual(notebookCounts(state), { total: 0, uttered: 0, unuttered: 0 });
});

test('счётчики квитанции: uttered/unuttered — факт витрины, без какого-либо стопа', () => {
  const state = foldNotebook([
    { verb: 'append', id: 'o1', body: 'a', at: 'T' },
    { verb: 'append', id: 'o2', body: 'b', at: 'T' },
    { verb: 'uttered', id: 'o2', at: 'T' },
  ]);
  assert.deepEqual(notebookCounts(state), { total: 2, uttered: 1, unuttered: 1 });
});

test('дом тетради — session tree (path-конвенция M6 DoD п.4)', () => {
  assert.equal(notebookRel('2026-07-28'), 'docs/bridge/2026-07-28/observations.jsonl');
});
