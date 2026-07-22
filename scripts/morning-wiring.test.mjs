import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { auditMorningWiring, loadMorningWiringFrame } from './lib/morning-wiring.mjs';
import { validateProcedure } from './lib/validate-procedure.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('F3: morning-wiring в preflight ritual-day, holder ozhegov, 3 pins', () => {
  const { frame, problems } = loadMorningWiringFrame(repoRoot);
  assert.equal(problems.length, 0, problems.join('; '));
  assert.equal(frame.id, 'morning-wiring');
  assert.equal(frame.holder, 'ozhegov');
  assert.equal(frame.pins.length, 3);
});

test('F3: validateProcedure(ritual-day) зелёный с preflight', () => {
  const dir = resolve(repoRoot, 'docs/procedures/ritual-day');
  const r = validateProcedure(dir, repoRoot);
  assert.equal(r.valid, true, r.problems.join('; '));
});

test('F3: auditMorningWiring — двери matched (живой репо)', () => {
  const r = auditMorningWiring(repoRoot);
  assert.equal(r.stop, false, r.problems.join('; ') + '\n' + r.table);
  assert.ok(r.findings.every((f) => f.status === 'matched'), r.table);
  assert.equal(r.ok, true);
});
