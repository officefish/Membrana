import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';

import {
  CLOSURE_REVIEW_SKILL_MIRRORS,
  CLOSURE_REVIEW_SKILL_REL,
  syncTaskClosureReviewSkills,
} from './sync-task-closure-review-skills.mjs';

const canonical = `---
name: membrana-task-closure-review
description: test
---

# Test
`;

function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'membrana-skills-'));
  const path = resolve(cwd, CLOSURE_REVIEW_SKILL_REL);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, canonical, 'utf8');
  return cwd;
}

test('skill verifier reports missing mirrors as drift', () => {
  const results = syncTaskClosureReviewSkills({ cwd: fixture() });
  assert.equal(results.length, 2);
  assert.ok(results.every((result) => result.synced === false));
});

test('skill sync writes byte-identical Cursor and Claude mirrors', () => {
  const cwd = fixture();
  const divergent = resolve(cwd, CLOSURE_REVIEW_SKILL_MIRRORS[0]);
  mkdirSync(dirname(divergent), { recursive: true });
  writeFileSync(divergent, 'drift', 'utf8');
  const results = syncTaskClosureReviewSkills({ cwd, write: true });
  assert.ok(results.every((result) => result.synced));
  for (const rel of CLOSURE_REVIEW_SKILL_MIRRORS) {
    assert.equal(readFileSync(resolve(cwd, rel), 'utf8'), canonical);
  }
});
