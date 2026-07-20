import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { softSkipMissingYarnScript, yarnScriptExists } from './lib/optional-yarn-script.mjs';

test('#725: yarnScriptExists читает package.json', () => {
  const dir = mkdtempSync(join(tmpdir(), 'opt-yarn-'));
  try {
    const pkg = join(dir, 'package.json');
    writeFileSync(pkg, JSON.stringify({ scripts: { 'night:close': 'node x' } }), 'utf8');
    assert.equal(yarnScriptExists('night:close', pkg), true);
    assert.equal(yarnScriptExists('night:land-reports', pkg), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('#725: soft-skip не fail при отсутствии скрипта', () => {
  const dir = mkdtempSync(join(tmpdir(), 'opt-yarn-'));
  const warnings = [];
  try {
    const pkg = join(dir, 'package.json');
    writeFileSync(pkg, JSON.stringify({ scripts: {} }), 'utf8');
    const r = softSkipMissingYarnScript('night:land-reports', {
      packageJsonPath: pkg,
      log: (s) => warnings.push(s),
    });
    assert.equal(r.skipped, true);
    assert.equal(r.ok, true);
    assert.match(warnings[0], /soft-skip/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
