/**
 * Зубы готовности переключения (S9 плана интеграции; заседание `tariff-grid`).
 *
 * Сторожат правило M8: включение источника истины законно только при полной
 * готовности; откат — выключение флага без двойной записи.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { CUTOVER_REQUIREMENTS, cutoverReadiness, mayEnableGridMode, rollbackPlan } from './lib/tariff-cutover.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const liveExists = (p) => existsSync(join(repoRoot, p));

test('все девять опор плана имеют носителя в дереве', () => {
  const missing = CUTOVER_REQUIREMENTS.filter((r) => !liveExists(r.carrier));
  assert.deepEqual(missing.map((r) => r.id), [], 'шаг без носителя — не выполненный шаг');
});

test('при живых носителях и зелёных зубах переключение законно', () => {
  const readiness = cutoverReadiness(liveExists, { gridClean: true });
  assert.equal(readiness.ready, true);
  assert.equal(mayEnableGridMode(readiness), true);
});

test('красные зубы запрещают включение даже при всех носителях', () => {
  const readiness = cutoverReadiness(liveExists, { gridClean: false });
  assert.equal(readiness.ready, false);
  assert.equal(mayEnableGridMode(readiness), false);
  assert.match(readiness.blockers.at(-1).reason, /непроверенном носителе/u);
});

test('пропавший носитель называется поимённо, а не «что-то не так»', () => {
  const readiness = cutoverReadiness((p) => p !== 'docs/tariffs/tariff-grid.json' && liveExists(p), {
    gridClean: true,
  });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.blockers.length, 1);
  assert.equal(readiness.blockers[0].where, 'S1_grid_home');
  assert.match(readiness.blockers[0].reason, /tariff-grid\.json/u);
});

test('откат — выключение флага, двойная запись НЕ включается', () => {
  const plan = rollbackPlan();
  assert.equal(plan.action, 'disable_grid_mode');
  assert.equal(plan.dualWrite, false);
  assert.match(plan.note, /два автора/u);
});

test('«включить, потому что надо» негде написать: предикат один', () => {
  assert.equal(mayEnableGridMode({ ready: false, blockers: [{}] }), false);
  assert.equal(mayEnableGridMode({}), false);
  assert.equal(mayEnableGridMode(undefined), false);
});
