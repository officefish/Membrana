/**
 * Зубы полноты пола: все глаголы мастерской, а не один входной.
 *
 * Находка холодной сессии 31.07 — сессия дважды грепала `package.json` за именами
 * не-входных глаголов, потому что в полу была только одна команда на мастерскую.
 *
 * Прогон: `node --test scripts/session-floor-verbs.test.mjs`
 */

import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { allVerbs, buildFloor } from './lib/session-floor.mjs';
import { checkBudget, renderFloor } from './lib/session-floor-render.mjs';
import { renderHealth, validateFloor } from './lib/session-floor-validate.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-07-31T12:00:00Z';

const floorLines = () => {
  const f = buildFloor(repoRoot, { stamps: { lines: ['ш1', 'ш2', 'ш3', 'ш4'] } });
  return { f, lines: renderFloor(f, validateFloor(f, { now: NOW }), { renderHealth }) };
};

// ── Ровно те две команды, за которыми сессия ходила грепать ───────────────────────────────

test('в полу есть команды, за которыми холодная сессия грепала package.json', () => {
  const text = floorLines().lines.join('\n');
  // `scripts:sets-of` — это inspectElement, третий в тройке; `tooling:atlas` — вообще не
  // входной. Обе сессия искала руками, имея дверь в дом.
  assert.match(text, /yarn scripts:sets-of/u, 'обратный поиск обязан быть в полу');
  assert.match(text, /yarn tooling:atlas/u, 'глагол справочника обязан быть в полу');
});

test('мастерская несёт ВСЕ свои команды, а не одну', () => {
  const { f } = floorLines();
  const scripts = f.workshops.find((w) => w.home === 'scripts');
  assert.deepEqual(scripts.verbs, ['yarn scripts:orphans', 'yarn scripts:registry', 'yarn scripts:sets-of']);
  assert.equal(scripts.entryVerb, 'yarn scripts:orphans', 'входной глагол остался прежним');
});

// ── Цена: строки не выросли ───────────────────────────────────────────────────────────────

test('полнота не стоила ни одной лишней строки', () => {
  const { f, lines } = floorLines();
  // Команды ушли в хвост существующих строк: одна строка на мастерскую как и была.
  const rows = lines.filter((l) => /^ {2}\S+(?: ⚠)? · (?!—(?: ·|$))/u.test(l));
  assert.equal(rows.length, f.workshops.filter((w) => w.verbs.length > 0).length);
  const b = checkBudget(lines);
  assert.equal(b.ok, true, `выдача ${b.lines} строк при бюджете ${b.budget}`);
  assert.ok(b.lines <= 26, `фактически ${b.lines} — рост против прежних 22 должен быть нулевым`);
});

// ── Форма ─────────────────────────────────────────────────────────────────────────────────

test('дубли команд схлопываются — одна дверь печатается один раз', () => {
  // Одна команда под двумя ключами делает выдачу длиннее, не делая полнее.
  assert.deepEqual(allVerbs({ audit: 'yarn x', decompose: 'yarn x', inspectElement: null }), ['yarn x']);
});

test('порядок канонический: audit → decompose → inspectElement', () => {
  assert.deepEqual(
    allVerbs({ inspectElement: 'yarn i', audit: 'yarn a', decompose: 'yarn d' }),
    ['yarn a', 'yarn d', 'yarn i'],
  );
});

test('пусто и мусор дают пустой список, а не исключение', () => {
  assert.deepEqual(allVerbs({}), []);
  assert.deepEqual(allVerbs(null), []);
  assert.deepEqual(allVerbs(['audit']), [], 'массив ключей словарём не является');
  assert.deepEqual(allVerbs({ audit: '  ', decompose: null }), []);
});

test('мастерская без глаголов печатает прочерк, а не пустоту', () => {
  // §6: «входной глагол или честный прочерк». docs/containers/strategic-docs — все verbs null.
  const { lines } = floorLines();
  const dash = lines.find((l) => /strategic-docs/u.test(l));
  assert.ok(dash, 'мастерская без глаголов остаётся в выдаче');
  assert.match(dash, / · —/u, 'прочерк на месте команды');
});
