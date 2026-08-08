import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { auditMorningWiring, loadMorningWiringFrame } from './lib/morning-wiring.mjs';
import { isAdr0025Debt } from './lib/procedure-personas.mjs';
import { validateProcedure } from './lib/validate-procedure.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('F3: morning-wiring в preflight ritual-day, holder ozhegov, 3 pins', () => {
  const { frame, problems } = loadMorningWiringFrame(repoRoot);
  assert.equal(problems.length, 0, problems.join('; '));
  assert.equal(frame.id, 'morning-wiring');
  assert.equal(frame.holder, 'ozhegov');
  assert.equal(frame.pins.length, 3);
});

test('F3: validateProcedure(ritual-day) без посторонних дефектов — долг ADR-0025 не в счёт', () => {
  // До ADR-0025 зуб утверждал `valid === true` и был прав. После Р2 у пяти фреймов утра в
  // holder стоит модератор — это НАЗВАННЫЙ долг, ждущий отдельной задачи #1787 (так велит
  // Р3: переназначение — своя задача со своей ратификацией). Зуб меняет утверждение, а не
  // ослабляется: любой ДРУГОЙ дефект утра по-прежнему роняет.
  const dir = resolve(repoRoot, 'docs/procedures/ritual-day');
  const r = validateProcedure(dir, repoRoot);
  const foreign = r.problems.filter((p) => !isAdr0025Debt(p));
  assert.deepEqual(foreign, [], 'посторонний дефект утра сверх долга ADR-0025');
  assert.ok(r.moderatorInHolder.length > 0, 'долг утра существует — иначе #1787 беспредметна');
});

test('F3: auditMorningWiring — двери matched (живой репо)', () => {
  const r = auditMorningWiring(repoRoot);
  assert.equal(r.stop, false, r.problems.join('; ') + '\n' + r.table);
  assert.ok(r.findings.every((f) => f.status === 'matched'), r.table);
  assert.equal(r.ok, true);
});
