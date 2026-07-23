/**
 * Static contract for .githooks/pre-commit (#1002 / DRU-366):
 * gitleaks non-zero must abort; missing binary and SKIP_PRECOMMIT stay soft-skip.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hookBody = readFileSync(join(root, '.githooks', 'pre-commit'), 'utf8');

test('pre-commit: SKIP_PRECOMMIT=1 soft-skips', () => {
  assert.match(hookBody, /SKIP_PRECOMMIT.*=.*"1"/);
  assert.ok(hookBody.includes('SKIP_PRECOMMIT=1'));
});

test('pre-commit: missing gitleaks binary soft-skips', () => {
  assert.match(hookBody, /command -v gitleaks/);
  assert.match(hookBody, /if ! command -v gitleaks/);
});

test('pre-commit: gitleaks non-zero aborts (no blind OK)', () => {
  assert.match(hookBody, /gitleaks protect --staged --no-banner --redact/);
  const dollarQ = String.fromCharCode(36) + '?';
  assert.ok(
    hookBody.includes('gitleaks protect --staged --no-banner --redact || exit ' + dollarQ),
    'must pipe non-zero gitleaks into exit (Issue #1002)',
  );
  const okIdx = hookBody.indexOf('pre-commit: OK');
  const protectIdx = hookBody.indexOf('gitleaks protect --staged');
  assert.ok(okIdx > protectIdx, 'OK must come after protect');
  const between = hookBody.slice(protectIdx, okIdx);
  assert.ok(between.includes('|| exit'), 'OK must be unreachable after failed protect');
});
