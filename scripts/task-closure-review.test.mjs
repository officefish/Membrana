import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import {
  applyTeamleadReview,
  buildTaskClosureReviewPrompt,
  detectReviewTier,
  finalizeReviewManifest,
  hasSufficientReviewEvidence,
  loadReviewManifest,
  manifestPath,
  markReviewArchived,
  normalizeGithubCheckRuns,
  prepareReviewManifest,
  reviewStatus,
  saveReviewManifest,
  writeReviewArtifact,
} from './lib/task-closure-review.mjs';
import { parseTaskClosureReviewCli } from './task-closure-review.mjs';

const SHA_A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const SHA_B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const task = { id: 'example-task', status: 'active', githubIssue: 185 };

function prepare(overrides = {}) {
  return prepareReviewManifest({
    task,
    currentCommitSha: SHA_A,
    branch: 'feature/example',
    baseRef: `${SHA_A}^`,
    files: ['packages/example/src/index.ts'],
    now: '2026-06-28T10:00:00.000Z',
    ...overrides,
  });
}

test('detectReviewTier routes docs, package and core changes', () => {
  assert.equal(detectReviewTier(['docs/README.md']), 'T0');
  assert.equal(detectReviewTier(['packages/example/src/index.ts']), 'T1');
  assert.equal(detectReviewTier(['packages/core/src/index.ts']), 'T2');
  assert.equal(
    detectReviewTier(['packages/a/src/a.ts', 'packages/services/b/src/b.ts']),
    'T2',
  );
});

test('service catalog README is not classified as a package', () => {
  assert.equal(
    detectReviewTier(['packages/services/README.md', 'docs/SERVICES.md']),
    'T1',
  );
});

test('prepare creates review_pending manifest bound to task and SHA', () => {
  const manifest = prepare();
  assert.equal(manifest.taskId, task.id);
  assert.equal(manifest.state, 'review_pending');
  assert.equal(manifest.verdict, 'pending');
  assert.equal(manifest.currentCommitSha, SHA_A);
  assert.deepEqual(manifest.scope.packages, ['packages/example']);
});

test('prepare is idempotent for the same SHA and scope', () => {
  const existing = prepare();
  const again = prepare({ existing, now: '2026-06-28T11:00:00.000Z' });
  assert.deepEqual(again, existing);
});

test('new SHA invalidates LGTM and review artifact', () => {
  const existing = {
    ...prepare(),
    state: 'lgtm',
    verdict: 'LGTM',
    reviewedCommitSha: SHA_A,
    reviewArtifact: `docs/reviews/example-task/${SHA_A}-review.md`,
    reviewersStatus: { vesnin: 'approved', ozhegov: 'approved' },
  };
  const next = prepare({
    currentCommitSha: SHA_B,
    baseRef: `${SHA_B}^`,
    existing,
    now: '2026-06-28T11:00:00.000Z',
  });
  assert.equal(next.state, 'review_pending');
  assert.equal(next.verdict, 'pending');
  assert.equal(next.reviewedCommitSha, null);
  assert.equal(next.reviewArtifact, null);
});

test('scope change on the same SHA invalidates LGTM', () => {
  const existing = {
    ...prepare(),
    state: 'lgtm',
    verdict: 'LGTM',
    reviewedCommitSha: SHA_A,
    reviewArtifact: `docs/reviews/example-task/${SHA_A}-review.md`,
  };
  const changed = prepare({ files: ['packages/example/src/other.ts'], existing });
  assert.equal(changed.state, 'review_pending');
  assert.equal(changed.verdict, 'pending');
});

test('status reports manifest stale against another HEAD', () => {
  const status = reviewStatus(prepare(), SHA_B);
  assert.equal(status.stale, true);
  assert.equal(status.state, 'implementation_ready');
  assert.equal(status.readyForReview, false);
});

test('parallel tasks use separate manifest paths and round-trip', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'membrana-review-'));
  const first = prepare();
  const second = prepare({ task: { ...task, id: 'second-task' } });
  saveReviewManifest(first, cwd);
  saveReviewManifest(second, cwd);
  assert.notEqual(manifestPath(first.taskId, cwd), manifestPath(second.taskId, cwd));
  assert.deepEqual(loadReviewManifest(first.taskId, cwd), first);
  assert.deepEqual(loadReviewManifest(second.taskId, cwd), second);
});

test('CLI parser supports prepare/status and dry-run', () => {
  assert.deepEqual(
    parseTaskClosureReviewCli(['prepare', '--id', 'example-task', '--pr=42', '--dry-run']),
    {
      help: false,
      command: 'prepare',
      id: 'example-task',
      ref: 'HEAD',
      base: '',
      pr: 42,
      reviewFile: '',
      acceptedBranchOnly: '',
      mergeEvidence: '',
      notes: '',
      checks: [],
      dryRun: true,
    },
  );
  assert.equal(parseTaskClosureReviewCli(['status', '--id=example-task']).command, 'status');
  assert.deepEqual(
    parseTaskClosureReviewCli(['run', '--id=example-task', '--check', 'yarn test']),
    {
      help: false,
      command: 'run',
      id: 'example-task',
      ref: 'HEAD',
      base: '',
      pr: null,
      reviewFile: '',
      acceptedBranchOnly: '',
      mergeEvidence: '',
      notes: '',
      checks: ['yarn test'],
      dryRun: false,
    },
  );
  assert.throws(() => parseTaskClosureReviewCli(['prepare']), /--id/);
  assert.equal(
    parseTaskClosureReviewCli([
      'finalize',
      '--id=example-task',
      '--accepted-branch-only=human accepted',
    ]).acceptedBranchOnly,
    'human accepted',
  );
});

function withEvidence(manifest, count = 2) {
  return {
    ...manifest,
    evidence: {
      hasUnresolvedP0P1: false,
      checks: Array.from({ length: count }, (_, index) => ({
        command: index === 0 ? 'git diff --check' : 'yarn test',
        status: 'pass',
        exitCode: 0,
        commitSha: manifest.currentCommitSha,
        checkedAt: '2026-06-28T11:00:00.000Z',
        note: '',
      })),
    },
  };
}

const lgtmBody = `Tier: T1
Task: example-task
Commit: ${SHA_A}

[Teamlead]: LGTM
[Структурщик]: boundaries checked
[Математик]: —
[Музыкант]: —
[Верстальщик]: —

P0/P1: —
P2: —
Checks: git diff --check — pass; yarn test — pass
Closure readiness: waiting_merge
Verdict: LGTM`;

test('review prompt binds task, manifest and exact diff', () => {
  const prompt = buildTaskClosureReviewPrompt({
    manifest: prepare(),
    task,
    taskPrompt: '# DoD',
    regulation: '# Regulation',
    teamleadPrompt: '# Teamlead',
    diff: '+change',
  });
  assert.match(prompt, /example-task/);
  assert.match(prompt, new RegExp(SHA_A));
  assert.match(prompt, /\+change/);
});

test('LGTM transition requires tier evidence and binds immutable artifact', () => {
  const reviewed = applyTeamleadReview(withEvidence(prepare()), lgtmBody);
  assert.equal(reviewed.state, 'lgtm');
  assert.equal(reviewed.verdict, 'LGTM');
  assert.equal(reviewed.reviewedCommitSha, SHA_A);
  assert.match(reviewed.reviewArtifact, new RegExp(`${SHA_A}-review\\.md$`));
  assert.equal(hasSufficientReviewEvidence(reviewed), true);
});

test('LGTM is rejected when T1 evidence has only diff check', () => {
  assert.throws(
    () => applyTeamleadReview(withEvidence(prepare(), 1), lgtmBody),
    /недостаточно evidence/,
  );
});

test('review tier must match manifest tier', () => {
  assert.throws(
    () => applyTeamleadReview(withEvidence(prepare()), lgtmBody.replace('Tier: T1', 'Tier: T0')),
    /tier mismatch/,
  );
});

test('LGTM cannot contain unresolved P0/P1 text', () => {
  assert.throws(
    () => applyTeamleadReview(
      withEvidence(prepare()),
      lgtmBody.replace('P0/P1: —', 'P0/P1: 1. Hidden blocker'),
    ),
    /LGTM несовместим/,
  );
});

test('BLOCK transition records unresolved blocker state', () => {
  const body = lgtmBody
    .replace('[Teamlead]: LGTM', '[Teamlead]: BLOCK')
    .replace('P0/P1: —', 'P0/P1: 1. Missing required test')
    .replace('Closure readiness: waiting_merge', 'Closure readiness: needs_fix')
    .replace('Verdict: LGTM', 'Verdict: BLOCK');
  const reviewed = applyTeamleadReview(prepare(), body);
  assert.equal(reviewed.state, 'blocked');
  assert.equal(reviewed.evidence.hasUnresolvedP0P1, true);
  assert.equal(reviewed.reviewersStatus.vesnin, 'blocked');
});

test('review artifact is immutable but idempotent for identical content', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'membrana-artifact-'));
  const reviewed = applyTeamleadReview(withEvidence(prepare()), lgtmBody);
  const first = writeReviewArtifact(reviewed, lgtmBody, cwd);
  const second = writeReviewArtifact(reviewed, lgtmBody, cwd);
  assert.equal(first, second);
  assert.throws(() => writeReviewArtifact(reviewed, `${lgtmBody}\nchanged`, cwd), /Immutable/);
});

test('finalize requires exact reviewed SHA and completion evidence', () => {
  const lgtm = applyTeamleadReview(withEvidence(prepare()), lgtmBody);
  assert.throws(
    () => finalizeReviewManifest(lgtm, { actualCommitSha: SHA_B, mode: 'merged', evidence: 'PR #1' }),
    /current SHA/,
  );
  assert.throws(
    () => finalizeReviewManifest(lgtm, { actualCommitSha: SHA_A, mode: 'merged', evidence: '' }),
    /completion evidence/,
  );
});

test('merged review transitions to archived idempotently', () => {
  const lgtm = applyTeamleadReview(withEvidence(prepare()), lgtmBody);
  const merged = finalizeReviewManifest(lgtm, {
    actualCommitSha: SHA_A,
    mode: 'merged',
    evidence: 'PR #42 merged 2026-06-28',
  });
  const archived = markReviewArchived(merged);
  assert.equal(merged.state, 'merged');
  assert.equal(archived.state, 'archived');
  assert.equal(archived.completion.mode, 'merged');
  assert.deepEqual(markReviewArchived(archived), archived);
});

test('accepted branch-only can archive without pretending merge', () => {
  const lgtm = applyTeamleadReview(withEvidence(prepare()), lgtmBody);
  const accepted = finalizeReviewManifest(lgtm, {
    actualCommitSha: SHA_A,
    mode: 'accepted_branch_only',
    evidence: 'Accepted branch-only: owner deferred PR',
  });
  const archived = markReviewArchived(accepted);
  assert.equal(archived.state, 'archived');
  assert.equal(archived.completion.mode, 'accepted_branch_only');
  assert.match(archived.completion.evidence, /owner deferred/);
});

test('GitHub check-runs become SHA-bound pass/fail evidence', () => {
  const checks = normalizeGithubCheckRuns([
    { name: 'CI', status: 'completed', conclusion: 'success', completed_at: '2026-06-28T12:00:00.000Z', html_url: 'https://example.test/pass' },
    { name: 'Security', status: 'completed', conclusion: 'failure', completed_at: '2026-06-28T12:01:00.000Z', html_url: 'https://example.test/fail' },
    { name: 'Optional', status: 'completed', conclusion: 'skipped', completed_at: '2026-06-28T12:02:00.000Z', html_url: 'https://example.test/skipped' },
  ], SHA_A);
  assert.deepEqual(checks.map((check) => check.status), ['pass', 'fail', 'skipped']);
  assert.ok(checks.every((check) => check.commitSha === SHA_A));
  assert.match(checks[0].command, /^github-check:/);
});

test('review-file fallback does not require provider-sized diff', () => {
  assert.throws(
    () => buildTaskClosureReviewPrompt({
      manifest: prepare(),
      task,
      taskPrompt: 'prompt',
      regulation: 'regulation',
      teamleadPrompt: 'teamlead',
      diff: 'x'.repeat(80_001),
    }),
    /слишком велик/,
  );
  // The CLI intentionally bypasses prompt construction when --review-file is supplied.
  assert.equal(parseTaskClosureReviewCli(['run', '--id', task.id, '--review-file', 'review.md']).reviewFile, 'review.md');
});
