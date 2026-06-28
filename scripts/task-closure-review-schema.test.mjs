import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

const schema = readJson('../docs/schemas/task-closure-review.schema.json');
const pending = readJson('../docs/reviews/examples/review-pending.json');
const lgtm = readJson('../docs/reviews/examples/lgtm.json');
const SHA_RE = /^[0-9a-f]{40}$/;

function validateCoreInvariants(manifest) {
  for (const field of schema.required) {
    assert.ok(Object.hasOwn(manifest, field), `missing required field: ${field}`);
  }
  assert.equal(manifest.schemaVersion, 1);
  assert.match(manifest.taskId, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(schema.properties.state.enum.includes(manifest.state));
  assert.ok(schema.properties.tier.enum.includes(manifest.tier));
  assert.match(manifest.currentCommitSha, SHA_RE);

  if (['lgtm', 'merged', 'accepted_branch_only', 'archived'].includes(manifest.state)) {
    assert.equal(manifest.verdict, 'LGTM');
    assert.match(manifest.reviewedCommitSha, SHA_RE);
    assert.equal(manifest.reviewedCommitSha, manifest.currentCommitSha);
    assert.match(manifest.reviewArtifact, /-review\.md$/);
    assert.equal(manifest.evidence.hasUnresolvedP0P1, false);
  }

  if (['blocked', 'needs_fix'].includes(manifest.state)) {
    assert.equal(manifest.verdict, 'BLOCK');
    assert.equal(manifest.evidence.hasUnresolvedP0P1, true);
  }
}

test('closure review schema is draft 2020-12 and fail-closed', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.required.includes('currentCommitSha'));
  assert.ok(schema.required.includes('reviewArtifact'));
  assert.ok(schema.allOf.length >= 4);
});

test('review_pending example satisfies core invariants', () => {
  validateCoreInvariants(pending);
  assert.equal(pending.verdict, 'pending');
  assert.equal(pending.reviewedCommitSha, null);
});

test('lgtm example is bound to the exact commit SHA', () => {
  validateCoreInvariants(lgtm);
  assert.equal(lgtm.reviewersStatus.vesnin, 'approved');
});

test('stale LGTM is rejected by the runtime invariant', () => {
  assert.throws(() =>
    validateCoreInvariants({
      ...lgtm,
      currentCommitSha: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    }),
  );
});
