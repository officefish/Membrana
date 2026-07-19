import assert from 'node:assert/strict';
import test from 'node:test';

import { decideDelegation, SUBAGENT_KINDS } from './lib/angelina-delegate.mjs';

const { ANALYST, SCRIBE } = SUBAGENT_KINDS;

// Полная таблица истинности — все 8 комбинаций входов (DoD блока lead-persona).
// [fitsOneContext, needsParallelFactua, isLongLivedDocument] → {delegate, kinds}
const TRUTH_TABLE = [
  { fits: true,  parallel: false, longLived: false, delegate: false, kinds: [] },
  { fits: true,  parallel: true,  longLived: false, delegate: true,  kinds: [ANALYST] },
  { fits: true,  parallel: false, longLived: true,  delegate: true,  kinds: [SCRIBE] },
  { fits: true,  parallel: true,  longLived: true,  delegate: true,  kinds: [ANALYST, SCRIBE] },
  { fits: false, parallel: false, longLived: false, delegate: true,  kinds: [] },
  { fits: false, parallel: true,  longLived: false, delegate: true,  kinds: [ANALYST] },
  { fits: false, parallel: false, longLived: true,  delegate: true,  kinds: [SCRIBE] },
  { fits: false, parallel: true,  longLived: true,  delegate: true,  kinds: [ANALYST, SCRIBE] },
];

for (const row of TRUTH_TABLE) {
  const label =
    `fitsOneContext=${row.fits} needsParallelFactua=${row.parallel} ` +
    `isLongLivedDocument=${row.longLived}`;
  test(`decideDelegation: ${label}`, () => {
    const result = decideDelegation({
      fitsOneContext: row.fits,
      needsParallelFactua: row.parallel,
      isLongLivedDocument: row.longLived,
    });
    assert.equal(result.delegate, row.delegate);
    assert.deepEqual(result.kinds, row.kinds);
  });
}

test('единственный «делаю сама» — (true, false, false), эталон шторма 19.07', () => {
  const selfRows = TRUTH_TABLE.filter((row) => row.delegate === false);
  assert.equal(selfRows.length, 1);
  assert.deepEqual(
    selfRows[0],
    { fits: true, parallel: false, longLived: false, delegate: false, kinds: [] },
  );
});

test('общий триггер ¬fitsOneContext не выдумывает род: kinds пуст', () => {
  const { delegate, kinds } = decideDelegation({
    fitsOneContext: false,
    needsParallelFactua: false,
    isLongLivedDocument: false,
  });
  assert.equal(delegate, true);
  assert.deepEqual(kinds, []);
});

test('детерминированный порядок родов: analyst, затем scribe', () => {
  const { kinds } = decideDelegation({
    fitsOneContext: true,
    needsParallelFactua: true,
    isLongLivedDocument: true,
  });
  assert.deepEqual(kinds, [ANALYST, SCRIBE]);
});

test('чистота: повторный вызов с теми же входами даёт тот же результат', () => {
  const inputs = {
    fitsOneContext: false,
    needsParallelFactua: true,
    isLongLivedDocument: false,
  };
  assert.deepEqual(decideDelegation(inputs), decideDelegation(inputs));
});

test('небулев вход — наблюдаемая ошибка, не молчаливый дефолт', () => {
  assert.throws(
    () => decideDelegation({
      fitsOneContext: 'да',
      needsParallelFactua: false,
      isLongLivedDocument: false,
    }),
    TypeError,
  );
  assert.throws(
    () => decideDelegation({ fitsOneContext: true, needsParallelFactua: false }),
    TypeError,
  );
  assert.throws(() => decideDelegation(null), TypeError);
  assert.throws(() => decideDelegation(undefined), TypeError);
});
