/**
 * Зуб merge-fact (#1320): git решает, gh вспомогательный — оба пути и honest unknown.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assessMergeFact, prLandingPatterns } from './merge-fact.mjs';

test('коммит в origin/base найден → merged, причина несёт короткий sha', () => {
  const r = assessMergeFact({ prNumber: 1318, base: 'main', fetchOk: true, commitInBase: '3e2798a2deadbeef' });
  assert.equal(r.verdict, 'merged');
  assert.equal(r.sha, '3e2798a2deadbeef');
  assert.match(r.reasons[0], /3e2798a2/u);
});

test('вещдок 27.07: gh кричит MERGED, но в свежем origin/base коммита нет → not-merged, gh назван вспомогательным', () => {
  const r = assessMergeFact({ prNumber: 1318, fetchOk: true, commitInBase: null, ghState: 'MERGED', ghMergeCommit: 'ffffffff', ghShaInBase: false });
  assert.equal(r.verdict, 'not-merged');
  assert.ok(r.reasons.some((x) => /вспомогательн/u.test(x)));
});

test('fetch не прошёл и графом не подтверждено → unknown, НЕ «ок» и НЕ «нет»', () => {
  const r = assessMergeFact({ prNumber: 5, fetchOk: false, commitInBase: null, ghState: 'MERGED' });
  assert.equal(r.verdict, 'unknown');
  assert.ok(r.reasons.some((x) => /не принимать за факт/u.test(x)));
});

test('mergeCommit от gh, подтверждённый графом (предок origin/base) → merged', () => {
  const r = assessMergeFact({ prNumber: 7, fetchOk: false, commitInBase: null, ghMergeCommit: '5949a30c', ghShaInBase: true });
  assert.equal(r.verdict, 'merged');
  assert.equal(r.sha, '5949a30c');
});

test('открытый PR: fetch прошёл, коммита нет, gh говорит OPEN → not-merged без паники', () => {
  const r = assessMergeFact({ prNumber: 9, fetchOk: true, commitInBase: null, ghState: 'OPEN' });
  assert.equal(r.verdict, 'not-merged');
  assert.ok(!r.reasons.some((x) => /расхождение/u.test(x)));
});

test('паттерны приземления: сквош-якорь конца строки и merge-коммит; упоминание «(PR #N)» в середине не ловится', () => {
  const [squash, merge] = prLandingPatterns(1316);
  assert.equal(squash, '\\(#1316\\)$');
  assert.equal(merge, '^Merge pull request #1316 ');
  const re = new RegExp(squash, 'u');
  assert.ok(re.test('feat(tooling): строгая сверка (#1316)'));
  assert.ok(!re.test('chore(tasks): архив — зуб встал (PR #1316) продолжение'));
  assert.ok(!re.test('feat: смежная работа (#13160)'));
});
