/**
 * Зубы готовности единственного источника тарифов (#2333; заседание `tariff-grid`).
 *
 * Сторожат правило M8: публикация источника истины законна только при полной
 * готовности; откат — возврат артефакта без двойной записи.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  CUTOVER_REQUIREMENTS,
  CUTOVER_TEETH,
  cutoverReadiness,
  mayPublishGridTruth,
  rollbackPlan,
} from './lib/tariff-cutover.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const liveExists = (p) => existsSync(join(repoRoot, p));

test('все девять опор плана имеют носителя в дереве', () => {
  const missing = CUTOVER_REQUIREMENTS.filter((r) => !liveExists(r.carrier));
  assert.deepEqual(missing.map((r) => r.id), [], 'шаг без носителя — не выполненный шаг');
});

test('при живых носителях и зелёных зубах переключение законно', () => {
  const readiness = cutoverReadiness(liveExists, allTeeth(true));
  assert.equal(readiness.ready, true);
  assert.equal(mayPublishGridTruth(readiness), true);
});

test('красные зубы запрещают включение даже при всех носителях', () => {
  const readiness = cutoverReadiness(liveExists, { ...allTeeth(true), deviceProjectionClean: false });
  assert.equal(readiness.ready, false);
  assert.equal(mayPublishGridTruth(readiness), false);
  assert.equal(readiness.blockers.at(-1).where, 'deviceProjectionClean');
  assert.match(readiness.blockers.at(-1).reason, /непроверенном носителе/u);
});

test('пропавший носитель называется поимённо, а не «что-то не так»', () => {
  const readiness = cutoverReadiness((p) => p !== 'docs/tariffs/tariff-grid.json' && liveExists(p), allTeeth(true));
  assert.equal(readiness.ready, false);
  assert.equal(readiness.blockers.length, 1);
  assert.equal(readiness.blockers[0].where, 'v2_grid_home');
  assert.match(readiness.blockers[0].reason, /tariff-grid\.json/u);
});

test('откат — возврат артефакта, двойная запись НЕ включается', () => {
  const plan = rollbackPlan();
  assert.equal(plan.action, 'restore_previous_artifact');
  assert.equal(plan.dualWrite, false);
  assert.match(plan.note, /два автора/u);
});

test('«включить, потому что надо» негде написать: предикат один', () => {
  assert.equal(mayPublishGridTruth({ ready: false, blockers: [{}] }), false);
  assert.equal(mayPublishGridTruth({}), false);
  assert.equal(mayPublishGridTruth(undefined), false);
});

test('старый S0_scalars не является опорой cutover', () => {
  assert.equal(CUTOVER_REQUIREMENTS.some((r) => r.id === 'S0_scalars'), false);
  assert.equal(CUTOVER_REQUIREMENTS.some((r) => r.carrier.includes('tariff-scalars')), false);
});

function allTeeth(value) {
  return Object.fromEntries(CUTOVER_TEETH.map((tooth) => [tooth.id, value]));
}
