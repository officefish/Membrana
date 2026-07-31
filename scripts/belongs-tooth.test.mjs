/**
 * Зубы прибора инварианта — два места проверки, одна лемма (§5 `workshop-wires`).
 *
 * Прогон: `node --test scripts/belongs-tooth.test.mjs`
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { WAIVERS_REL, parseArgs, renderToothReport } from './belongs-tooth.mjs';
import { INVARIANT_PHASES, checkInvariant, freezeBaseline, readBaseline } from './lib/belongs-invariant.mjs';
import { partitionWaivers } from './lib/orphan-waiver.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NOW = '2026-07-31T10:00:00Z';

const base = (paths) => readBaseline(freezeBaseline(paths, '2026-07-31T09:00:00Z', 'включение'));
const empty = partitionWaivers([], NOW);

test('аргументы: умолчание — рабочая фаза и полная область', () => {
  const a = parseArgs([]);
  assert.equal(a.phase, INVARIANT_PHASES.GROWTH);
  assert.equal(a.scopeFrom, null, 'без --scope-from область не сужается');
  assert.deepEqual(parseArgs(['--scope-from', 'f.txt', '--phase', 'absolute', '--now', NOW, '--json']), {
    scopeFrom: 'f.txt', phase: 'absolute', now: NOW, json: true, freeze: false, reason: null,
  });
});

test('знаменатель печатается ВСЕГДА — «прироста нет» без него неотличимо от «не проверяли»', () => {
  const res = checkInvariant({ orphans: ['scripts/a.mjs'], baseline: base(['scripts/a.mjs']), now: NOW });
  const text = renderToothReport(res, empty);
  assert.match(text, /сирот всего 1/u);
  assert.match(text, /✓ прироста бесхозного нет/u);
  assert.match(text, /наследство 1 — само по себе не блокирует/u);
});

test('область названа словами: затронутое пушем против полного знаменателя', () => {
  const input = { orphans: ['scripts/a.mjs', 'scripts/b.mjs'], baseline: base([]), now: NOW };
  const scoped = renderToothReport(checkInvariant({ ...input, scope: ['scripts/a.mjs'] }), empty, { scopeSize: 1 });
  assert.match(scoped, /затронутое пушем \(1 путей\)/u);
  assert.match(renderToothReport(checkInvariant(input), empty), /полный знаменатель/u);
});

test('при красном названы законные ходы и назван НЕ-ход', () => {
  const res = checkInvariant({ orphans: ['scripts/new.mjs'], baseline: base([]), now: NOW });
  const text = renderToothReport(res, empty);
  assert.match(text, /инвариант нарушен: 1/u);
  assert.match(text, /припарковать в дом или неймспейс/u);
  assert.match(text, /выдать освобождение со сроком/u);
  // §5 прямым текстом: рубильник хука освобождением инварианта не является.
  assert.match(text, /SKIP_PREPUSH освобождением НЕ является/u);
});

test('проверка не состоялась печатается отдельно от нарушения', () => {
  const res = checkInvariant({ orphans: ['scripts/a.mjs'], now: NOW });
  const text = renderToothReport(res, empty);
  assert.match(text, /проверка НЕ состоялась/u);
  assert.match(text, /зуб не включён/u);
  assert.doesNotMatch(text, /инвариант нарушен/u, '«не проверяли» и «нарушен» — разные новости');
});

test('фаза 2 показывает в нарушителях и наследство', () => {
  const res = checkInvariant({
    orphans: ['scripts/old.mjs', 'scripts/new.mjs'],
    baseline: base(['scripts/old.mjs']),
    now: NOW,
    phase: INVARIANT_PHASES.ABSOLUTE,
  });
  const text = renderToothReport(res, empty);
  assert.match(text, /инвариант нарушен: 2/u);
  assert.match(text, /scripts\/old\.mjs/u);
});

test('след освобождений в отчёте есть даже когда их ноль', () => {
  const res = checkInvariant({ orphans: [], baseline: base([]), now: NOW });
  assert.match(renderToothReport(res, empty), /освобождений действует 0/u);
});

test('зуб НЕ вписан в pre-push — разблокирование включением не является', () => {
  const hook = readFileSync(join(repoRoot, '.githooks', 'pre-push'), 'utf8');
  assert.ok(!hook.includes('belongs-tooth'), 'включение зуба — отдельное решение владельца');
});

test('носители инварианта живут в одном доме', () => {
  assert.equal(WAIVERS_REL, 'docs/namespaces/ORPHAN_WAIVERS.json');
});
