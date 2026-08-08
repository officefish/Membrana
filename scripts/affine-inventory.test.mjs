import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { parseArgs, runAffineInventory } from './affine-inventory.mjs';

const INPUT = resolve('scripts/fixtures/affine-inventory/source.json');
const GIT = 'd'.repeat(40);

test('CLI requires explicit input, output and git sha', () => {
  assert.throws(() => parseArgs([]), /--input/u);
  assert.throws(() => parseArgs(['--input', INPUT, '--out', 'x']), /--git-sha/u);
  assert.throws(() => parseArgs(['--live']), /unknown option/u);
  assert.deepEqual(parseArgs(['--help']), { help: true });
});

test('CLI writes only manifest and detached seal into a new output directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'affine-inventory-cli-'));
  const out = join(root, 'out');
  const report = runAffineInventory({ inputPath: INPUT, outDir: out, gitSha: GIT });
  assert.equal(report.ok, true);
  assert.equal(report.liveInv1, 'NOT_PERFORMED');
  assert.equal(existsSync(join(out, 'manifest.json')), true);
  assert.match(readFileSync(join(out, 'manifest.sha256'), 'utf8'), /^[a-f0-9]{64}  manifest\.json\n$/u);
  assert.throws(() => runAffineInventory({ inputPath: INPUT, outDir: out, gitSha: GIT }));
});

test('process entrypoint is offline and fails closed without explicit arguments', () => {
  const result = spawnSync(process.execPath, ['scripts/affine-inventory.mjs'], {
    cwd: resolve('.'), encoding: 'utf8', env: {},
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--input: value required/u);
});

test('process entrypoint is recognized through a path containing spaces', () => {
  const root = mkdtempSync(join(tmpdir(), 'affine inventory spaced '));
  const linkedRepo = join(root, 'repo with spaces');
  symlinkSync(resolve('.'), linkedRepo, process.platform === 'win32' ? 'junction' : 'dir');
  const result = spawnSync(process.execPath, [join(linkedRepo, 'scripts', 'affine-inventory.mjs')], {
    cwd: linkedRepo, encoding: 'utf8', env: {},
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--input: value required/u);
});
