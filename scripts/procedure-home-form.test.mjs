import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  HOME_FORM_COMPAT,
  HOME_FORM_VERSION,
  homeFormProblems,
  migrateHomeForm,
} from './lib/procedure-home-form.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('migrateHomeForm: version:1 → formVersion + compat', () => {
  const out = migrateHomeForm({
    version: 1,
    mustExist: ['state.json'],
    extensionsMayAdd: true,
    extensionsMayNotOverride: true,
  });
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(out.migrated, true);
  assert.equal(out.form.formVersion, HOME_FORM_VERSION);
  assert.deepEqual(out.form.compat, [...HOME_FORM_COMPAT]);
  assert.equal('version' in out.form, false);
});

test('migrateHomeForm: уже formVersion — идемпотентно', () => {
  const out = migrateHomeForm({
    formVersion: '1.0.0',
    compat: ['1.0.0'],
    mustExist: ['a'],
    extensionsMayNotOverride: true,
  });
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(out.migrated, false);
  assert.equal(out.form.formVersion, '1.0.0');
});

test('homeFormProblems: legacy на диске — дефект; живой мостик — чист', () => {
  const legacy = homeFormProblems({
    version: 1,
    mustExist: ['state.json'],
    extensionsMayNotOverride: true,
  });
  assert.ok(legacy.some((p) => p.includes('legacy')), legacy.join('; '));

  const outside = homeFormProblems({
    formVersion: '9.9.9',
    compat: ['9.9.9'],
    mustExist: ['x'],
    extensionsMayNotOverride: true,
  });
  assert.ok(outside.some((p) => p.includes('вне окна compat')), outside.join('; '));

  const bridge = JSON.parse(
    readFileSync(resolve(repoRoot, 'docs/bridge/HOME.form.json'), 'utf8'),
  );
  assert.equal(homeFormProblems(bridge).length, 0, homeFormProblems(bridge).join('; '));
  assert.equal(bridge.formVersion, HOME_FORM_VERSION);
});
