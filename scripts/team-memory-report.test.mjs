/**
 * Зубы отчёта памяти команды (#1366 ч.1, форма token 121).
 * Чистый разбор диффа — фикстуры, без git/фс.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseMemoryDiff, renderMemoryReport } from './lib/team-memory-report.mjs';

const DIFF = [
  '--- a/docs/virtual-team/memory/dynin.md',
  '+++ b/docs/virtual-team/memory/dynin.md',
  '+### 2026-07-28 · позиция · day-memo-contract',
  '-### 2026-07-23 · позиция · tasks-workshop-m2-set',
  '-### 2026-07-23 · позиция · tasks-workshop-m3-axes',
  '+### 2026-07-27 · позиция · unchanged-entry',
  '-### 2026-07-27 · позиция · unchanged-entry',
  '--- a/docs/virtual-team/memory/ozhegov.md',
  '+++ b/docs/virtual-team/memory/ozhegov.md',
  '+### 2026-07-28 · позиция · charter-terms',
].join('\n');

test('parseMemoryDiff: добавленное → записал, удалённое → вытеснил, поимённо', () => {
  const r = parseMemoryDiff(DIFF);
  assert.equal(r.dynin.added.length, 1);
  assert.equal(r.dynin.added[0].slug, 'day-memo-contract');
  assert.equal(r.dynin.evicted.length, 2, 'обе вытесненные записи видны');
  assert.deepEqual(r.dynin.evicted.map((x) => x.slug), ['tasks-workshop-m2-set', 'tasks-workshop-m3-axes']);
  assert.equal(r.ozhegov.added.length, 1);
  assert.equal(r.ozhegov.evicted.length, 0);
});

test('перестановка (та же запись ушла и пришла) — не событие памяти', () => {
  const r = parseMemoryDiff(DIFF);
  const slugs = [...r.dynin.added, ...r.dynin.evicted].map((x) => x.slug);
  assert.ok(!slugs.includes('unchanged-entry'), 'перестановка не считается ни записью, ни потерей');
});

test('пустой дифф → честное «изменений нет», не молчание', () => {
  const { markdown, totals } = renderMemoryReport(parseMemoryDiff(''), { personas: ['dynin'], date: '2026-07-28' });
  assert.ok(markdown.includes('изменений нет'));
  assert.deepEqual(totals, { added: 0, evicted: 0 });
});

test('форма token 121: три строки на персону, всплывало — с пометкой контура (v1)', () => {
  const { markdown } = renderMemoryReport(parseMemoryDiff(DIFF), { date: '2026-07-28' });
  assert.ok(markdown.includes('записал в оперативку'));
  assert.ok(markdown.includes('утонуло в подсознание'));
  assert.ok(markdown.includes('всплывало сегодня: контур не поставлен'), 'несуществующий контур не имитируется');
  assert.ok(markdown.includes('tasks-workshop-m2-set [2026-07-23]'), 'вытеснение поимённо с датой записи');
});

test('регрессия: вытеснено больше, чем записано → громкий сигнал', () => {
  const onlyEvicted = [
    '--- a/docs/virtual-team/memory/dynin.md',
    '+++ b/docs/virtual-team/memory/dynin.md',
    '-### 2026-07-23 · позиция · lost-one',
    '-### 2026-07-23 · позиция · lost-two',
  ].join('\n');
  const { regression, markdown } = renderMemoryReport(parseMemoryDiff(onlyEvicted), { date: '2026-07-28' });
  assert.equal(regression, true);
  assert.ok(markdown.includes('СИГНАЛ РЕГРЕССИИ'));
});
