import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const RUNNER = join(root, 'scripts', 'ritual-evening-run.mjs');

function run(args) {
  return spawnSync(process.execPath, [RUNNER, ...args], { cwd: root, encoding: 'utf8' });
}

test('инцидент 11.08: неизвестный флаг — отказ exit 2 ДО любого шага, не живой прогон', () => {
  const r = run(['--dry-run']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /неизвестные аргументы: --dry-run/u);
  // ни одна строка исполнения шагов не напечатана
  assert.ok(!/=== ritual:evening →/u.test(r.stdout + r.stderr));
});

test('--dry остаётся планом: печатает «запустился бы», exit 0', () => {
  const r = run(['--dry']);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /запустился бы/u);
});
