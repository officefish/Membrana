// Зуб #2147/№3: доклад о доставке принимается только со свидетельством ствола.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  collectTrunkEvidence,
  deliveryReportProblems,
  extractDeliveryClaims,
} from './lib/delivery-report.mjs';

const SHIP_LINE = 'итог: PR #2152 state=MERGED mergeCommit=504983fd (по gh pr view --json state,mergeCommit)';

test('#2147/3 заявка со строкой pr:ship — принимается', () => {
  const report = `Сделано: зуб 2 влит (#2152).\n${SHIP_LINE}\n`;
  assert.deepEqual(deliveryReportProblems(report), []);
});

test('#2147/3 порча: заявка БЕЗ свидетельства — доклад не принимается', () => {
  const report = 'PR #2152 влит, всё хорошо.';
  const problems = deliveryReportProblems(report);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /#2152 заявлен доставленным БЕЗ свидетельства/);
});

test('#2147/3 порча: свидетельство спорит с заявкой (OPEN) — расхождение вслух', () => {
  const report = 'PR #2141 влит.\nитог: PR #2141 state=OPEN (по gh pr view --json state,mergeCommit)';
  const problems = deliveryReportProblems(report);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /state=OPEN, а не MERGED/);
});

test('#2147/3 MERGED без mergeCommit — недостаточно (мердж ≠ закрытие)', () => {
  const report = 'PR #2143 смёржен.\nитог: PR #2143 state=MERGED (по gh pr view --json state,mergeCommit)';
  const problems = deliveryReportProblems(report);
  assert.match(problems[0], /без mergeCommit/);
});

test('#2147/3 сырой вывод gh pr view с JSON-результатом — тоже свидетельство', () => {
  const report = [
    'PR #2139 доставлен.',
    '$ gh pr view 2139 --json state,mergeCommit',
    '{',
    '  "mergeCommit": { "oid": "a24429e9deadbeef" },',
    '  "state": "MERGED"',
    '}',
  ].join('\n');
  assert.deepEqual(deliveryReportProblems(report), []);
  const e = collectTrunkEvidence(report).get(2139);
  assert.equal(e.state, 'MERGED');
  assert.equal(e.mergeCommit, 'a24429e9deadbeef');
});

test('#2147/3 без заявок о доставке — проверять нечего, доклад принимается', () => {
  assert.deepEqual(deliveryReportProblems('Работаю в ветке, PR #2156 открыт, жду CI.'), []);
});

test('#2147/3 несколько заявок: каждая судится отдельно', () => {
  const report = [
    'Влиты #2152 и #2154.',
    SHIP_LINE,
    // #2154 — без свидетельства
  ].join('\n');
  const problems = deliveryReportProblems(report);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /#2154/);
});

test('#2147/3 строка-свидетельство сама по себе заявкой не считается', () => {
  assert.deepEqual(extractDeliveryClaims(SHIP_LINE), []);
  assert.deepEqual(extractDeliveryClaims('зуб 2 влит (#2152)'), [2152]);
});

test('#2147/3 живой ложный позитив 25.08: номер issue в строке заявки — не заявка о PR', () => {
  // Первый боевой прогон предиката: «пять зубов #2147 доставлены» пометил issue
  // как недоставленный PR. Ссылки вида «issue #N» / «зубов #N» — не предмет сверки.
  assert.deepEqual(extractDeliveryClaims('## Сессия Б — пять зубов #2147 доставлены (25.08)'), []);
  assert.deepEqual(extractDeliveryClaims('доставлен issue #2147'), []);
  // но настоящая заявка в той же строке остаётся заявкой
  assert.deepEqual(extractDeliveryClaims('зубов #2147: влит PR #2152'), [2152]);
});

// Боевая находка 27.08, своя: доклад сессии Б заявлял четыре доставки одной строкой, а
// предикат подтверждал одну — три PR проходили приёмку БЕЗ свидетельства ствола.
test('#2147/3 заявка ПЕРЕЧИСЛЕНИЕМ ловится целиком: «Влиты PR #a, #b, #c» — три заявки, не одна', () => {
  assert.deepEqual(
    extractDeliveryClaims('Влиты PR #2207, #2208, #2211, #2213 — свидетельства ствола ниже.'),
    [2207, 2208, 2211, 2213],
  );
});

test('#2147/3 перечисление через «и» — тоже перечисление', () => {
  assert.deepEqual(extractDeliveryClaims('Доставлены PR #2207 и #2208'), [2207, 2208]);
});

test('#2147/3 хвост перечисления обрывается на первом же не-разделителе: дальше контекст', () => {
  // «#2181» отделён словами — это задача, а не вторая заявка (правило 26.08 не ослаблено).
  assert.deepEqual(
    extractDeliveryClaims('Влит PR #2189, он закрывает находку по задаче #2181'),
    [2189],
  );
});

test('#2147/3 голый номер ПЕРЕД явным остаётся контекстом — перечисление читается только вперёд', () => {
  assert.deepEqual(extractDeliveryClaims('**1. #2181 — зависание.** Влит PR #2189, #2190'), [2189, 2190]);
});

test('#2147/3 боевой ложный позитив №2 (26.08): явный PR в строке делает прочие номера контекстом', () => {
  // «**1. #2181 — зависание панели.** Влит PR #2189» — задача и PR в одной строке.
  assert.deepEqual(extractDeliveryClaims('**1. #2181 — зависание панели.** Влит PR #2189'), [2189]);
  // Голый номер остаётся заявкой, когда явного «PR #N» в строке нет — зуб не ослаб.
  assert.deepEqual(extractDeliveryClaims('влит #2152'), [2152]);
  // Два явных PR в одной строке — обе заявки.
  assert.deepEqual(extractDeliveryClaims('влиты PR #2196 и PR #2197'), [2196, 2197]);
});
