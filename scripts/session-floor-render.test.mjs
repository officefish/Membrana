/**
 * Зубы рендера пола и арифметики порога (§6 контракта `workshop-wires`).
 *
 * Прогон: `node --test scripts/session-floor-render.test.mjs`
 */

import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FLOOR_LINE_BUDGET, FLOOR_SHAPES, checkBudget, renderFloor } from './lib/session-floor-render.mjs';
import { buildFloor } from './lib/session-floor.mjs';
import { renderHealth, validateFloor } from './lib/session-floor-validate.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-07-31T12:00:00Z';

const floor = (over = {}) => ({
  workshops: [
    { home: 'docs/tasks', entryVerb: 'yarn task:tools', description: 'мастерская задач', valid: true },
    { home: 'scripts', entryVerb: 'yarn scripts:orphans', description: 'мастерская скриптов', valid: true },
  ],
  workshopCount: 2,
  compact: false,
  callable: { calls: ['yarn task:tools', 'yarn scripts:orphans'], dropped: 0 },
  namespaces: [],
  registryState: 'ok',
  registryProblems: [],
  policyLine: 'сначала обзор и глагол мастерской, греп — последний',
  docLink: 'docs/tooling-atlas/registry/ATLAS.md',
  stamps: { lines: ['штамп: дерево 31.07', 'штамп: origin 31.07'] },
  secondLevelAt: NOW,
  ...over,
});

const health = (f) => validateFloor(f, { now: NOW });
const opts = { renderHealth };

test('порядок §6 не переставляется', () => {
  const f = floor();
  const lines = renderFloor(f, health(f), opts);
  const idx = (re) => lines.findIndex((l) => re.test(l));
  assert.ok(idx(/штамп/u) < idx(/мастерские/u));
  assert.ok(idx(/мастерские/u) < idx(/вызовы/u));
  assert.ok(idx(/вызовы/u) < idx(/греп — последний/u));
  assert.ok(idx(/греп — последний/u) < idx(/документация/u));
  assert.ok(idx(/документация/u) < idx(/инвентарь: ok/u), 'отчёт последний — он про качество предыдущего');
});

test('при DEGRADED полоса поднимается на первую строку', () => {
  const f = floor({ registryState: 'absent', registryProblems: ['реестра нет'] });
  const lines = renderFloor(f, health(f), opts);
  assert.match(lines[0], /^DEGRADED/u, 'до штампов и до содержимого');
});

test('тёплая сессия — только штампы и отчёт, каталог не печатается', () => {
  const f = floor();
  const lines = renderFloor(f, health(f), { ...opts, warm: true });
  assert.ok(lines.some((l) => /штамп/u.test(l)));
  assert.ok(lines.some((l) => /инвентарь: ok/u.test(l)));
  assert.ok(!lines.some((l) => /мастерские \(/u.test(l)), 'повторной печати каталога нет');
  assert.ok(!lines.some((l) => /документация:/u.test(l)));
});

test('сжатая форма печатает счётчик из проекции, а не длину списка', () => {
  const f = floor({ compact: true, workshopCount: 21, workshops: floor().workshops });
  const lines = renderFloor(f, health(f), opts);
  assert.ok(lines.some((l) => /мастерских 21/u.test(l)), 'счётчик по проекции, иначе сжатие соврёт о числе домов');
  assert.ok(!lines.some((l) => /docs\/tasks ·/u.test(l)), 'перечень свёрнут');
});

test('честный прочерк и пометка битого манифеста доезжают до строки', () => {
  const f = floor({
    workshops: [
      { home: 'a', entryVerb: null, description: null, valid: true },
      { home: 'b', entryVerb: 'yarn b', description: null, valid: false },
    ],
    workshopCount: 2,
  });
  const lines = renderFloor(f, health(f), opts);
  assert.ok(lines.some((l) => /^ {2}a · —$/u.test(l)), 'прочерк, а не выдуманный глагол');
  assert.ok(lines.some((l) => /^ {2}b ⚠ · yarn b/u.test(l)), 'битый помечен, но остаётся в выдаче');
});

test('остаток набора вызовов назван числом', () => {
  const f = floor({ callable: { calls: ['yarn a'], dropped: 7 } });
  assert.ok(renderFloor(f, health(f), opts).some((l) => /… и ещё 7/u.test(l)));
});

// ── Арифметика порога: оговорка аудита к §6 ───────────────────────────────────────────────

test('живая выдача укладывается в бюджет — порог проверен счётом, а не на глаз', () => {
  const live = buildFloor(repoRoot, { stamps: { lines: ['штамп 1', 'штамп 2', 'штамп 3', 'штамп 4'] } });
  const lines = renderFloor(live, validateFloor(live, { now: NOW }), opts);
  const budget = checkBudget(lines);
  assert.equal(budget.ok, true, `выдача ${budget.lines} строк при бюджете ${budget.budget}`);
  // Замер, а не оценка: 22 строки при 13 мастерских. И комната (40 — живой потолок), и
  // аудитор (30–38 уже сегодня) ошиблись; аудитор — на допущении, что вызовы печатаются по
  // строке на каждый. Зуб держит именно факт, чтобы шапка модуля не разошлась с реальностью.
  assert.ok(budget.lines >= 20 && budget.lines <= 26, `фактически ${budget.lines} строк — арифметика шапки разошлась с реальностью`);
});

test('перебор бюджета — предупреждение, а не тихая обрезка', () => {
  const many = Array.from({ length: FLOOR_LINE_BUDGET + 5 }, (_, i) => `строка ${i}`);
  const r = checkBudget(many);
  assert.equal(r.ok, false);
  assert.equal(r.lines, FLOOR_LINE_BUDGET + 5, 'строки не отрезаны — их посчитали');
  assert.match(r.warning, /не резать молча/u);
  // Молча обрезать значило бы отнять у сессии часть пола и не сказать об этом.
  assert.equal(checkBudget(many.slice(0, FLOOR_LINE_BUDGET)).ok, true, 'граница включительна');
});

test('формы выдачи — закрытый список из трёх', () => {
  assert.deepEqual(Object.values(FLOOR_SHAPES), ['full', 'compact', 'warm']);
});

test('рендер не ходит в ФС — единственный вход это проекция', async () => {
  // Косвенная, но честная проверка: модуль не импортирует node:fs.
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(resolve(repoRoot, 'scripts/lib/session-floor-render.mjs'), 'utf8');
  assert.ok(!/from ['"]node:fs['"]/u.test(src), 'дописать строку в выдачу должно быть неоткуда');
  assert.ok(!/child_process/u.test(src));
});
