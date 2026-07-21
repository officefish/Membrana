/**
 * Тесты инвентаря веток (repo:branches) — чистые правила без git.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  classifyBucket,
  compareBranchRows,
  formatMarkdownTable,
  isOriginTrackingRef,
  parseCli,
  renderBranchAudit,
  summarizeBuckets,
} from './lib/repo-branches.mjs';
import { worktreeBranches } from './repo-branches.mjs';

test('classifyBucket: sync / ahead-only / behind-only / diverged', () => {
  assert.equal(classifyBucket(0, 0), 'sync');
  assert.equal(classifyBucket(3, 0), 'ahead-only');
  assert.equal(classifyBucket(0, 2), 'behind-only');
  assert.equal(classifyBucket(1, 4), 'diverged');
});

test('summarizeBuckets: считает все четыре корзины', () => {
  const s = summarizeBuckets([
    { ahead: 0, behind: 0 },
    { ahead: 2, behind: 0 },
    { ahead: 0, behind: 1 },
    { ahead: 1, behind: 1 },
    { ahead: 5, behind: 0 },
  ]);
  assert.deepEqual(s, { sync: 1, 'ahead-only': 2, 'behind-only': 1, diverged: 1 });
});

test('compareBranchRows: diverged раньше sync', () => {
  const rows = [
    { name: 'z-sync', ahead: 0, behind: 0 },
    { name: 'a-div', ahead: 1, behind: 1 },
  ].sort(compareBranchRows);
  assert.equal(rows[0].name, 'a-div');
  assert.equal(rows[1].name, 'z-sync');
});

test('formatMarkdownTable: заголовки и экранирование |', () => {
  const md = formatMarkdownTable(['A', 'B'], [['x|y', '1']]);
  assert.ok(md.includes('| A | B |'));
  assert.ok(md.includes('| --- | --- |'));
  assert.ok(md.includes('x\\|y'));
});

test('renderBranchAudit: три markdown-таблицы и контракт колонок', () => {
  const out = renderBranchAudit({
    base: 'origin/main',
    currentBranch: 'feat/x',
    fetched: true,
    local: [
      { name: 'feat/x', ahead: 2, behind: 1, current: true, worktree: false },
      { name: 'main', ahead: 0, behind: 0, current: false, worktree: true },
    ],
    remote: [
      { name: 'origin/main', ahead: 0, behind: 0, worktree: true },
      { name: 'origin/feat/x', ahead: 2, behind: 1, worktree: false },
    ],
  });
  assert.ok(out.includes('## Local branches'));
  assert.ok(out.includes('## Remote origin/*'));
  assert.ok(out.includes('## Buckets summary'));
  assert.ok(out.includes('| Branch | Ahead | Behind | Bucket | Current | Worktree |'));
  assert.ok(out.includes('| Branch | Ahead | Behind | Bucket | Worktree |'));
  assert.ok(out.includes('| Bucket | Local | Remote |'));
  assert.ok(out.includes('| feat/x | 2 | 1 | diverged | yes |  |'));
  assert.ok(out.includes('squash lies') || out.includes('git branch --merged'));
  assert.ok(!out.includes(String.fromCharCode(27)), 'без ANSI');
});

test('parseCli: флаги --no-fetch / --json / --report / --help', () => {
  assert.deepEqual(parseCli(['--no-fetch', '--json']), {
    noFetch: true,
    json: true,
    report: null,
    help: false,
  });
  assert.equal(parseCli(['--report', 'out.md']).report, 'out.md');
  assert.equal(parseCli(['-h']).help, true);
});

test('worktreeBranches: porcelain → Set имён без refs/heads/', () => {
  const porcelain = [
    'worktree /repo',
    'HEAD abc',
    'branch refs/heads/main',
    '',
    'worktree /repo-wt',
    'HEAD def',
    'branch refs/heads/feat/x',
  ].join('\n');
  const set = worktreeBranches(porcelain);
  assert.ok(set.has('main'));
  assert.ok(set.has('feat/x'));
  assert.equal(set.size, 2);
});

test('isOriginTrackingRef: только origin/<name>, не bare origin и не HEAD', () => {
  assert.equal(isOriginTrackingRef('origin'), false);
  assert.equal(isOriginTrackingRef('origin/HEAD'), false);
  assert.equal(isOriginTrackingRef('origin/main'), true);
  assert.equal(isOriginTrackingRef('origin/feat/x'), true);
  assert.equal(isOriginTrackingRef('upstream/main'), false);
});
