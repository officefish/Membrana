/**
 * Зубы отчёта памяти команды (#1366 ч.1, форма token 121).
 * Чистый разбор диффа — фикстуры, без git/фс.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SURFACING_STATES,
  classifySurfacing,
  parseMemoryDiff,
  renderMemoryReport,
  surfacingLine,
} from './lib/team-memory-report.mjs';

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

test('форма token 121: три строки на персону, всплывало — по журналу (v2)', () => {
  // Прежняя редакция зуба требовала дословно «контур не поставлен» — и была права: контура
  // тогда не существовало, имитировать его было нельзя. 02.08 контур поставлен спринтом
  // subconscious-lift-c3 (PR #1634, #1635, #1636), и ложью стало ровно обратное. Зуб не
  // глушится, а переписывается на новый предмет: форма трёх строк неизменна, но третья
  // обязана называть СОСТОЯНИЕ дня.
  const { markdown } = renderMemoryReport(parseMemoryDiff(DIFF), { date: '2026-07-28' });
  assert.ok(markdown.includes('записал в оперативку'));
  assert.ok(markdown.includes('утонуло в подсознание'));
  assert.ok(markdown.includes('всплывало сегодня:'), 'третья строка кристалла на месте');
  assert.ok(!markdown.includes('контур не поставлен'), 'поставленный контур не объявляется отсутствующим');
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

// ── всплытие: четыре состояния, различимые по журналу ────────────────────────

test('перечень состояний всплытия закрыт и заморожен', () => {
  assert.deepEqual([...SURFACING_STATES], ['surfaced', 'rejected', 'empty-cloud', 'not-invoked']);
  assert.ok(Object.isFrozen(SURFACING_STATES));
});

test('«лифт не звали» и «облако пустое» различаются ОДНИМ полем, а не текстом', () => {
  // Оба дают пустой список актов. Разница — звали ли лифт вообще; она и есть предмет.
  const notInvoked = { cloudQueries: 0, invocations: [] };
  const emptyCloud = { cloudQueries: 1, invocations: [] };

  assert.equal(classifySurfacing(notInvoked), 'not-invoked');
  assert.equal(classifySurfacing(emptyCloud), 'empty-cloud');
  assert.notEqual(surfacingLine(notInvoked), surfacingLine(emptyCloud));
});

test('«лифт не звали» — про день, а не про отсутствие механизма', () => {
  const line = surfacingLine({ cloudQueries: 0, invocations: [] });
  assert.match(line, /лифт не звали/u);
  assert.doesNotMatch(line, /не поставлен/u, 'прежняя пометка была про отсутствие кода');
});

test('всплывшее показывается поимённо и с объяснением ПЕРСОНЫ', () => {
  const line = surfacingLine({
    cloudQueries: 1,
    invocations: [{ outcome: 'emerge', ref: 'vesnin-2026-07-29-m1-performer', reason: 'участие против назначения' }],
  });
  assert.match(line, /vesnin-2026-07-29-m1-performer/u, 'счёт без имени гонит читателя в журнал');
  assert.match(line, /участие против назначения/u);
  assert.match(line, /← архив/u, 'зеркало строки вытеснения: там → архив, здесь ← архив');
});

test('отказ персоны — не пустое облако: суждение против его отсутствия', () => {
  const rejected = { cloudQueries: 1, invocations: [{ outcome: 'reject', reason: 'ни одна запись не по теме' }] };
  assert.equal(classifySurfacing(rejected), 'rejected');
  assert.match(surfacingLine(rejected), /облако отвергнуто \(ни одна запись не по теме\)/u);
  assert.notEqual(classifySurfacing(rejected), classifySurfacing({ cloudQueries: 1, invocations: [] }));
});

test('отказ того же дня при состоявшемся всплытии не проглатывается', () => {
  const line = surfacingLine({
    cloudQueries: 2,
    invocations: [
      { outcome: 'emerge', ref: 'rec-a', reason: 'по делу' },
      { outcome: 'reject', reason: 'второе облако мимо' },
    ],
  });
  assert.match(line, /rec-a/u);
  assert.match(line, /отвергнутых облаков: 1/u, 'умолчать значило бы показать день полнее, чем он был');
});

test('персона без сводки не ломает отчёт и не врёт о поставленности контура', () => {
  const { markdown } = renderMemoryReport(parseMemoryDiff(DIFF), { date: '2026-07-28' });
  assert.ok(markdown.includes('всплывало сегодня: лифт не звали'));
  assert.ok(!markdown.includes('контур не поставлен'), 'ни в строке, ни в шапке');
});

test('сводка доезжает до отчёта по своей персоне, а не по всем сразу', () => {
  const { markdown } = renderMemoryReport(parseMemoryDiff(DIFF), {
    date: '2026-07-28',
    surfacingByPersona: {
      dynin: { cloudQueries: 1, invocations: [{ outcome: 'emerge', ref: 'rec-d', reason: 'к делу' }] },
    },
  });
  assert.ok(markdown.includes('rec-d ← архив (к делу)'));
  assert.ok(markdown.includes('всплывало сегодня: лифт не звали'), 'у прочих — своё состояние');
});

test('длинное объяснение подрезается ВИДИМО, а не молча', () => {
  const long = 'а'.repeat(400);
  const line = surfacingLine({ cloudQueries: 1, invocations: [{ outcome: 'emerge', ref: 'rec-a', reason: long }] });
  assert.ok(line.length < 400, 'строку отчёта должно быть возможно прочесть');
  assert.match(line, /… \(полностью — в журнале\)/u, 'огрызок не выдаётся за всё сказанное');
  assert.match(line, /rec-a/u, 'указатель на полное остаётся');
});

test('короткое объяснение не трогается', () => {
  const line = surfacingLine({ cloudQueries: 1, invocations: [{ outcome: 'emerge', ref: 'r', reason: 'к делу' }] });
  assert.match(line, /\(к делу\)/u);
  assert.doesNotMatch(line, /…/u);
});

test('несколько отказов за день считаются, а не сводятся к одному', () => {
  const one = surfacingLine({ cloudQueries: 1, invocations: [{ outcome: 'reject', reason: 'мимо' }] });
  const many = surfacingLine({
    cloudQueries: 3,
    invocations: [
      { outcome: 'reject', reason: 'мимо' },
      { outcome: 'reject', reason: 'тоже мимо' },
      { outcome: 'reject', reason: 'и это' },
    ],
  });
  assert.doesNotMatch(one, /\(1\)/u, 'единственный отказ счётом не украшается');
  assert.match(many, /отвергнуто \(3\)/u);
  assert.match(many, /причина первого/u, 'показана одна причина из трёх — сказано, какая');
});
