import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildScriptsInventory,
  extractScriptPaths,
  isScriptCodePath,
  parseScriptsRegistryCli,
  renderScriptsList,
} from './lib/scripts-inventory.mjs';

test('extractScriptPaths: node scripts/foo.mjs и ./scripts/lib/bar.mjs', () => {
  assert.deepEqual(extractScriptPaths('node scripts/foo.mjs'), ['scripts/foo.mjs']);
  assert.deepEqual(extractScriptPaths('node ./scripts/lib/bar.mjs --x'), ['scripts/lib/bar.mjs']);
  assert.deepEqual(extractScriptPaths('yarn turbo run lint'), []);
});

test('isScriptCodePath: только код под scripts/', () => {
  assert.equal(isScriptCodePath('scripts/a.mjs'), true);
  assert.equal(isScriptCodePath('scripts/lib/x.js'), true);
  assert.equal(isScriptCodePath('scripts/registry/README.md'), false);
  assert.equal(isScriptCodePath('docs/x.mjs'), false);
});

test('buildScriptsInventory: orphans и broken', () => {
  const inv = buildScriptsInventory({
    yarnScripts: {
      'ok': 'node scripts/ok.mjs',
      'ghost': 'node scripts/missing.mjs',
      'lint': 'eslint .',
    },
    files: ['scripts/ok.mjs', 'scripts/orphan.mjs'],
  });
  assert.equal(inv.counts.yarnTouching, 2);
  assert.equal(inv.counts.yarnOutside, 1);
  assert.deepEqual(inv.orphanFiles, ['scripts/orphan.mjs']);
  assert.equal(inv.yarnBroken.length, 1);
  assert.deepEqual(inv.yarnBroken[0].missing, ['scripts/missing.mjs']);
});

test('renderScriptsList: Meta + Summary', () => {
  const inv = buildScriptsInventory({
    yarnScripts: { a: 'node scripts/a.mjs' },
    files: ['scripts/a.mjs'],
  });
  const md = renderScriptsList(inv, { Date: '2026-07-21', 'Head SHA': 'abc', Source: 'test' });
  assert.match(md, /## Meta/);
  assert.match(md, /Head SHA/);
  assert.match(md, /`a` → `scripts\/a\.mjs`/);
});

test('parseScriptsRegistryCli', () => {
  const c = parseScriptsRegistryCli(['--report', 'out.md', '--dated', '--json']);
  assert.equal(c.report, 'out.md');
  assert.equal(c.dated, true);
  assert.equal(c.json, true);
  const d = parseScriptsRegistryCli(['--report']);
  assert.equal(d.report, 'scripts/registry/SCRIPTS_LIST.md');
});
