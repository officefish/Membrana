import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assessMerge, parseArgs } from './pr-verify.mjs';

test('assessMerge: MERGED + mergeCommit без файла → ok', () => {
  const r = assessMerge({ state: 'MERGED', mergeCommit: 'abc1234' });
  assert.equal(r.ok, true);
  assert.deepEqual(r.reasons, []);
});

test('assessMerge: state=OPEN → не ok (ловит «exit 0 ≠ merged»)', () => {
  const r = assessMerge({ state: 'OPEN', mergeCommit: null });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /state=OPEN/u.test(x)));
  assert.ok(r.reasons.some((x) => /mergeCommit/u.test(x)));
});

test('assessMerge: MERGED но mergeCommit null → не ok (ложный MERGED через branch-cleanup, #1119)', () => {
  const r = assessMerge({ state: 'MERGED', mergeCommit: null });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /mergeCommit отсутствует/u.test(x)));
});

test('assessMerge: файл требуется и найден → ok', () => {
  const r = assessMerge({ state: 'MERGED', mergeCommit: 'x', file: 'a/b.md', fileInBase: true, base: 'main' });
  assert.equal(r.ok, true);
});

test('assessMerge: файл требуется, но НЕ в базе → не ok с именем файла и базы', () => {
  const r = assessMerge({ state: 'MERGED', mergeCommit: 'x', file: 'a/b.md', fileInBase: false, base: 'main' });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => x.includes('a/b.md') && x.includes('origin/main')));
});

test('assessMerge: fileInBase null (не проверился) → не ok, честно', () => {
  const r = assessMerge({ state: 'MERGED', mergeCommit: 'x', file: 'a/b.md', fileInBase: null });
  assert.equal(r.ok, false);
  assert.ok(r.reasons.some((x) => /не удалось проверить/u.test(x)));
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
