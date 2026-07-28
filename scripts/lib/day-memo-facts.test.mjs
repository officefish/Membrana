/**
 * Зубы слоя Фактов DAY_MEMO (фаза 1, блок 1). Чистые функции — фикстуры без git/фс.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { factsFromGitLog, jsonlForDate, memoryReportSummary, parseSquashPr } from './day-memo-facts.mjs';

test('parseSquashPr: номер из squash-заголовка; без скобки — null', () => {
  assert.equal(parseSquashPr('feat(bridge): каркас (#1373)'), 1373);
  assert.equal(parseSquashPr('chore: без номера'), null);
  assert.equal(parseSquashPr('fix: (#12) в середине не считается'), null);
});

test('factsFromGitLog: метка времени обязательна — строка без неё не выходит', () => {
  const log = [
    'abc123def456|2026-07-28T10:00:00+03:00|feat: раз (#1)',
    'битая-строка-без-разделителей',
    'fed654cba321|2026-07-28T11:00:00+03:00|chore: два',
  ].join('\n');
  const facts = factsFromGitLog(log);
  assert.equal(facts.length, 2);
  assert.equal(facts[0].pr, 1);
  assert.equal(facts[1].pr, null);
  assert.ok(facts.every((f) => f.at.startsWith('2026-07-28')), 'каждый факт с меткой времени');
});

test('jsonlForDate: фильтр по дате, битый JSON → problems, не exception', () => {
  const text = [
    '{"id":"a","addedAt":"2026-07-28"}',
    '{"id":"b","addedAt":"2026-07-27"}',
    '{битый json',
    '{"id":"c","addedAt":"2026-07-28T15:00:00Z"}',
  ].join('\n');
  const { rows, problems } = jsonlForDate(text, '2026-07-28', 'addedAt');
  assert.deepEqual(rows.map((r) => r.id), ['a', 'c'], 'ISO-метка с временем тоже матчится по префиксу');
  assert.equal(problems.length, 1);
  assert.ok(problems[0].includes('строка 3'));
});

test('memoryReportSummary: итоговая строка распознаётся; её нет → null', () => {
  assert.equal(
    memoryReportSummary('…\n**Итог:** записано 21 · вытеснено 24.\n…'),
    'Итог: записано 21 · вытеснено 24.',
  );
  assert.equal(memoryReportSummary('отчёт без итога'), null);
});
