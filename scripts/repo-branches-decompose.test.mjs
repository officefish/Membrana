/**
 * Тесты декомпозиции веток (repo:branches:decompose) — чистые правила без git/gh.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  PERSONA_BRANCHES,
  classifyHygieneCategory,
  compareHygieneRows,
  decomposeBranches,
  isExperimentLeftover,
  isRemoteAgentZombie,
  parseDecomposeCli,
  renderHygieneDecompose,
  shortBranchName,
} from './lib/repo-branches-decompose.mjs';

test('shortBranchName: снимает origin/', () => {
  assert.equal(shortBranchName('origin/feat/x'), 'feat/x');
  assert.equal(shortBranchName('feat/x'), 'feat/x');
});

test('isExperimentLeftover: prefixes + ritual/persona leftovers', () => {
  assert.equal(isExperimentLeftover('cowork/foo'), true);
  assert.equal(isExperimentLeftover('comp/bar'), true);
  assert.equal(isExperimentLeftover('codex/baz'), true);
  assert.equal(isExperimentLeftover('night/sprint'), true);
  assert.equal(isExperimentLeftover('parallel-persona-x'), true);
  assert.equal(isExperimentLeftover('chore/ritual-day-0715'), true);
  assert.equal(isExperimentLeftover('feat/x'), false);
  assert.equal(isExperimentLeftover('chore/other'), false);
});

test('isRemoteAgentZombie: night-triage / claude', () => {
  assert.equal(isRemoteAgentZombie('night-triage/foo'), true);
  assert.equal(isRemoteAgentZombie('night-triage'), true);
  assert.equal(isRemoteAgentZombie('claude/agent'), true);
  assert.equal(isRemoteAgentZombie('claude'), true);
  assert.equal(isRemoteAgentZombie('feat/claude-helper'), false);
});

test('classifyHygieneCategory: first match wins — fixture matrix', () => {
  const openPrByHead = new Map([['feat/pr', { number: 42 }]]);
  const ctx = { openPrByHead, currentBranch: 'git-audit' };

  const cases = [
    [{ name: 'git-audit', ahead: 2, behind: 1, current: true }, 'worktree-active'],
    [{ name: 'wt-only', ahead: 0, behind: 5, worktree: true }, 'worktree-active'],
    [{ name: 'ozhegov', ahead: 0, behind: 10 }, 'personas'],
    [{ name: 'dynin', ahead: 1, behind: 0 }, 'personas'],
    [{ name: 'vesnin', ahead: 0, behind: 0 }, 'personas'],
    [{ name: 'boyarskiy', ahead: 3, behind: 2 }, 'personas'],
    [{ name: 'main', ahead: 0, behind: 0 }, 'baseline'],
    [{ name: 'base/tooling', ahead: 0, behind: 2 }, 'baseline'],
    [{ name: 'feat/pr', ahead: 4, behind: 1 }, 'in-flight'],
    [{ name: 'cowork/block-a', ahead: 2, behind: 0 }, 'experiment-leftover'],
    [{ name: 'chore/ritual-day-x', ahead: 1, behind: 0 }, 'experiment-leftover'],
    [{ name: 'stale-feat', ahead: 0, behind: 8 }, 'zombie'],
    [{ name: 'sync-dead', ahead: 0, behind: 0 }, 'zombie'],
    [{ name: 'unique-work', ahead: 5, behind: 2 }, 'salvage'],
    [
      { name: 'origin/night-triage/zombie', ahead: 3, behind: 0, scope: 'remote' },
      'zombie',
    ],
  ];

  for (const [branch, expected] of cases) {
    const got = classifyHygieneCategory(branch, ctx);
    assert.equal(
      got.category,
      expected,
      `${branch.name}: expected ${expected}, got ${got.category} (${got.why})`,
    );
  }

  // Persona wins over zombie (ahead==0) when not worktree
  assert.equal(classifyHygieneCategory({ name: 'ozhegov', ahead: 0, behind: 99 }, ctx).category, 'personas');

  // Open PR wins over experiment leftover prefix
  const openOnNight = new Map([['night/x', { number: 9 }]]);
  assert.equal(
    classifyHygieneCategory({ name: 'night/x', ahead: 1, behind: 0 }, { openPrByHead: openOnNight })
      .category,
    'in-flight',
  );

  // Without open PR map, in-flight head falls through
  assert.equal(
    classifyHygieneCategory({ name: 'feat/pr', ahead: 4, behind: 1 }, { openPrByHead: new Map() })
      .category,
    'salvage',
  );

  for (const p of PERSONA_BRANCHES) {
    assert.equal(classifyHygieneCategory({ name: p, ahead: 0, behind: 1 }, {}).category, 'personas');
  }
});

test('compareHygieneRows: sort contracts per category', () => {
  const behindSorted = [
    { name: 'a', behind: 1, ahead: 0 },
    { name: 'b', behind: 9, ahead: 0 },
  ].sort((a, b) => compareHygieneRows(a, b, 'zombie'));
  assert.equal(behindSorted[0].name, 'b');

  const prSorted = [
    { name: 'old', prNumber: 10, ahead: 1, behind: 0 },
    { name: 'new', prNumber: 99, ahead: 1, behind: 0 },
  ].sort((a, b) => compareHygieneRows(a, b, 'in-flight'));
  assert.equal(prSorted[0].name, 'new');

  const salvageSorted = [
    { name: 'small', ahead: 2, behind: 0 },
    { name: 'big', ahead: 20, behind: 0 },
  ].sort((a, b) => compareHygieneRows(a, b, 'salvage'));
  assert.equal(salvageSorted[0].name, 'big');
});

test('decomposeBranches: no double-count remote twin + summary counts', () => {
  const inventory = {
    currentBranch: 'git-audit',
    local: [
      { name: 'git-audit', ahead: 2, behind: 1, current: true, worktree: false },
      { name: 'main', ahead: 0, behind: 0, current: false, worktree: true },
      { name: 'ozhegov', ahead: 0, behind: 5, current: false, worktree: false },
      { name: 'feat/orphan', ahead: 3, behind: 1, current: false, worktree: false },
      { name: 'stale', ahead: 0, behind: 4, current: false, worktree: false },
    ],
    remote: [
      { name: 'origin/main', ahead: 0, behind: 0, worktree: true },
      { name: 'origin/feat/orphan', ahead: 3, behind: 1, worktree: false },
      { name: 'origin/only-remote', ahead: 2, behind: 0, worktree: false },
      { name: 'origin/night-triage/x', ahead: 1, behind: 0, worktree: false },
    ],
  };
  const openPrByHead = new Map();
  const d = decomposeBranches(inventory, { openPrByHead });

  assert.equal(d.skippedRemoteTwins, 2, 'main + feat/orphan twins');
  assert.ok(d.rows.every((r) => r.name !== 'origin/feat/orphan'));
  assert.ok(d.rows.some((r) => r.name === 'origin/only-remote'));
  assert.equal(d.byCategory['worktree-active'].length, 2); // git-audit + main (worktree)
  assert.equal(d.byCategory.personas.length, 1);
  assert.equal(d.byCategory.baseline.length, 0); // main already worktree-active
  assert.equal(d.byCategory.salvage.some((r) => r.name === 'feat/orphan'), true);
  assert.equal(d.byCategory.salvage.some((r) => r.name === 'origin/only-remote'), true);
  assert.equal(d.byCategory.zombie.some((r) => r.name === 'stale'), true);
  assert.equal(d.byCategory.zombie.some((r) => r.name === 'origin/night-triage/x'), true);
  assert.equal(d.counts.salvage.total, 2);
});

test('renderHygieneDecompose: summary + 7 category tables + column contract', () => {
  const inventory = {
    currentBranch: 'feat/x',
    local: [
      { name: 'feat/x', ahead: 2, behind: 1, current: true, worktree: false },
      { name: 'main', ahead: 0, behind: 0, current: false, worktree: false },
    ],
    remote: [],
  };
  const decomposition = decomposeBranches(inventory, {
    openPrByHead: new Map([['feat/pr', { number: 1 }]]),
  });
  const out = renderHygieneDecompose({
    base: 'origin/main',
    currentBranch: 'feat/x',
    fetched: false,
    ghAvailable: false,
    ghNote: 'gh missing',
    decomposition,
  });
  assert.ok(out.includes('## Taxonomy (first match wins)'));
  assert.ok(out.includes('## Summary'));
  assert.ok(out.includes('| Category | Local | Remote | Total |'));
  assert.ok(out.includes('## 1. Worktree-активные'));
  assert.ok(out.includes('## 7. Salvage'));
  assert.ok(
    out.includes('| Branch | Ahead | Behind | Bucket | Why/Note | Suggested action |'),
  );
  assert.ok(out.includes('category 4 empty') || out.includes('Category 4 empty') || out.includes('gh'));
  assert.ok(!out.includes(String.fromCharCode(27)), 'без ANSI');
});

test('parseDecomposeCli: флаги --no-fetch / --json / --report / --help', () => {
  assert.deepEqual(parseDecomposeCli(['--no-fetch', '--json']), {
    noFetch: true,
    json: true,
    report: null,
    help: false,
  });
  assert.equal(parseDecomposeCli(['--report', 'out.md']).report, 'out.md');
  assert.equal(parseDecomposeCli(['-h']).help, true);
});
