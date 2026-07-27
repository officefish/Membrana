import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fileReasons, parseArgs } from './pr-verify.mjs';

// Вердикт факта мерджа живёт в lib/merge-fact (#1320) и покрыт там же;
// здесь — то, что осталось у обвязки: файл-ассерт и разбор аргументов.

test('fileReasons: файл не запрашивался → пусто', () => {
  assert.deepEqual(fileReasons({ verdict: 'merged' }), []);
});

test('fileReasons: файл найден в базе → пусто', () => {
  assert.deepEqual(fileReasons({ file: 'a/b.md', fileInBase: true, base: 'main' }), []);
});

test('fileReasons: файла НЕТ в базе → причина с именем файла и базы', () => {
  const r = fileReasons({ file: 'a/b.md', fileInBase: false, base: 'main' });
  assert.equal(r.length, 1);
  assert.ok(r[0].includes('a/b.md') && r[0].includes('origin/main'));
});

test('fileReasons: проверка файла не прошла (null) → честная причина, не молчание', () => {
  const r = fileReasons({ file: 'a/b.md', fileInBase: null });
  assert.match(r[0], /не удалось проверить/u);
});

test('parseArgs: номер PR, --file, --base', () => {
  const o = parseArgs(['node', 'pr-verify.mjs', '1162', '--file', 'apps/x.md', '--base', 'main']);
  assert.equal(o.pr, '1162');
  assert.equal(o.file, 'apps/x.md');
  assert.equal(o.base, 'main');
});

test('parseArgs: без номера → PR текущей ветки (pr=null), дефолт base=main', () => {
  const o = parseArgs(['node', 'pr-verify.mjs', '--file', 'x.md']);
  assert.equal(o.pr, null);
  assert.equal(o.base, 'main');
  assert.equal(o.file, 'x.md');
});

test('parseArgs: --wait с дефолтами таймаута и интервала', () => {
  const o = parseArgs(['node', 'pr-verify.mjs', '1356', '--wait']);
  assert.equal(o.wait, true);
  assert.equal(o.timeoutMin, 10);
  assert.equal(o.intervalSec, 20);
  const o2 = parseArgs(['node', 'pr-verify.mjs', '--wait', '--timeout-min', '3', '--interval-sec', '5']);
  assert.equal(o2.timeoutMin, 3);
  assert.equal(o2.intervalSec, 5);
});
