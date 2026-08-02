import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_REFERENCED,
  buildReferencedStatesBlock,
  referencedNumbers,
  renderStatesBlock,
} from './review-referenced-states.mjs';

// ── выемка номеров ───────────────────────────────────────────────────────────

test('берёт номера из прозы, включая скобки и кавычки', () => {
  const text = 'Не мерджим #1562 без слова владельца (см. #1584), «#1590» и #1595;';
  assert.deepEqual(referencedNumbers(text), [1562, 1584, 1590, 1595]);
});

test('повторы схлопываются, порядок по возрастанию', () => {
  assert.deepEqual(referencedNumbers('#20 #10 #20 #10'), [10, 20]);
});

test('номера внутри адреса не берутся — они и так адресуемы', () => {
  const text = 'см. https://github.com/officefish/Membrana/pull/1562 и отдельно #1584';
  assert.deepEqual(referencedNumbers(text), [1584]);
});

test('короткие числа не номера: #7 — это не иссью, а сноска', () => {
  assert.deepEqual(referencedNumbers('пункт #7 и задача #1234'), [1234]);
});

test('потолок соблюдается — батч не раздувается диффом на сотни ссылок', () => {
  const many = Array.from({ length: MAX_REFERENCED + 20 }, (_, i) => `#${1000 + i}`).join(' ');
  assert.equal(referencedNumbers(many).length, MAX_REFERENCED);
});

test('пустой вход — пусто, а не бросок', () => {
  assert.deepEqual(referencedNumbers(''), []);
  assert.deepEqual(referencedNumbers(undefined), []);
});

// ── отрисовка ────────────────────────────────────────────────────────────────

test('таблица состояний прямо велит верить ей, а не тексту диффа', () => {
  const block = renderStatesBlock([1562], { unknown: false, states: { 1562: 'MERGED' }, missing: [] });
  assert.match(block, /\| #1562 \| MERGED \|/u);
  assert.match(block, /При расхождении верна эта таблица/u);
});

test('сеть недоступна — честное «не знаю» с причиной и прямой запрет судить', () => {
  const block = renderStatesBlock([1562], { unknown: true, reason: 'gh недоступен' });
  assert.match(block, /состояния НЕ известны: gh недоступен/u);
  assert.match(block, /нельзя вовсе/u);
  assert.doesNotMatch(block, /MERGED/u, 'молчание о причине вернуло бы доверие к прозе');
});

test('номер не найден и номер не запрошен различаются', () => {
  const block = renderStatesBlock([10, 20], { unknown: false, states: {}, missing: [10] });
  assert.match(block, /\| #10 \| не найден в репозитории \|/u);
  assert.match(block, /\| #20 \| не запрошен \|/u);
});

test('упоминаний нет — блока нет вовсе, а не пустая шапка', () => {
  assert.equal(renderStatesBlock([], { unknown: false, states: {}, missing: [] }), '');
});

// ── сборка ───────────────────────────────────────────────────────────────────

test('сборка зовёт снятие состояний ровно с найденными номерами', () => {
  let asked = null;
  const { numbers, block } = buildReferencedStatesBlock('правим #1562 и #1584', (ns) => {
    asked = ns;
    return { unknown: false, states: { 1562: 'MERGED', 1584: 'MERGED' }, missing: [] };
  });
  assert.deepEqual(asked, [1562, 1584]);
  assert.deepEqual(numbers, [1562, 1584]);
  assert.match(block, /#1584 \| MERGED/u);
});

test('без упоминаний сеть не дёргается вовсе', () => {
  let called = false;
  const { block } = buildReferencedStatesBlock('дифф без ссылок', () => {
    called = true;
    return { unknown: false, states: {}, missing: [] };
  });
  assert.equal(called, false);
  assert.equal(block, '');
});

test('снятие состояний обязательно — выдумывать их нельзя', () => {
  assert.throws(() => buildReferencedStatesBlock('правим #1562', null), /fetchStates обязателен/u);
});

// ── живой случай 01–02.08 ────────────────────────────────────────────────────

test('потолок жёсткий: чужое число его не поднимает', () => {
  const many = Array.from({ length: MAX_REFERENCED + 50 }, (_, i) => `#${2000 + i}`).join(' ');
  assert.equal(referencedNumbers(many, { max: 10_000 }).length, MAX_REFERENCED);
  assert.equal(referencedNumbers(many, { max: Number.NaN }).length, MAX_REFERENCED);
});

test('живой случай при обрыве сети: судить о состоянии запрещено прямо', () => {
  // Ветка, ради которой блок и заведён: номера нашлись, состояний нет. Молчание здесь
  // вернуло бы ревьюера к прозе диффа — то есть к тому самому дефекту.
  const diff = 'Не мерджим PR #1562 без слова владельца';
  const { numbers, block } = buildReferencedStatesBlock(diff, () => ({
    unknown: true,
    reason: 'gh недоступен',
  }));
  assert.deepEqual(numbers, [1562]);
  assert.match(block, /состояния НЕ известны/u);
  assert.match(block, /нельзя вовсе/u);
  assert.doesNotMatch(block, /MERGED|OPEN|CLOSED/u);
});

test('живой случай: проза говорит «не влит», таблица говорит MERGED', () => {
  const diff = 'Не мерджим PR #1562 (MFCC) без слова владельца — ребаза требует силового push';
  const { block } = buildReferencedStatesBlock(diff, () => ({
    unknown: false,
    states: { 1562: 'MERGED' },
    missing: [],
  }));
  assert.match(block, /#1562 \| MERGED/u);
  assert.match(block, /писался раньше/u, 'ревьюер обязан знать, почему проза расходится с фактом');
});
