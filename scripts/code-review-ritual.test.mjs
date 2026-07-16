import assert from 'node:assert/strict';
import test from 'node:test';

import {
  appendTaskContext,
  buildCodeReviewUserMessage,
  defaultOutputPath,
  estimateChangedLines,
  parseCodeReviewCli,
} from './lib/code-review-ritual.mjs';

test('parseCodeReviewCli daily defaults', () => {
  const cli = parseCodeReviewCli([]);
  assert.equal(cli.mode, 'daily');
  assert.equal(cli.full, false);
  assert.equal(cli.noRag, false);
});

test('parseCodeReviewCli pr mode', () => {
  const cli = parseCodeReviewCli(['--pr', '140', '--no-rag']);
  assert.equal(cli.mode, 'pr');
  assert.equal(cli.pr, '140');
  assert.equal(cli.noRag, true);
});

test('parseCodeReviewCli branch requires name', () => {
  assert.throws(() => parseCodeReviewCli(['--branch']), /ветку/);
});

test('parseCodeReviewCli staged mode (NB3)', () => {
  const cli = parseCodeReviewCli(['--staged']);
  assert.equal(cli.mode, 'staged');
});

test('parseCodeReviewCli uncommitted mode', () => {
  assert.equal(parseCodeReviewCli(['--uncommitted']).mode, 'uncommitted');
});

test('defaultOutputPath pr', () => {
  const p = defaultOutputPath({ mode: 'pr', pr: '140' });
  assert.match(p, /pr-140-code-review\.md$/);
});

test('buildCodeReviewUserMessage includes regulation and assignment', () => {
  const msg = buildCodeReviewUserMessage({
    mode: 'pr',
    regulation: 'REG',
    virtualTeam: 'VT',
    contextBlock: 'CTX',
    ragBlock: '',
    focusQuestion: '',
  });
  assert.match(msg, /REG/);
  assert.match(msg, /VT/);
  assert.match(msg, /CTX/);
  assert.match(msg, /LGTM или BLOCK/);
  assert.match(msg, /MAIN_DAY_ISSUE/);
});

test('estimateChangedLines parses git stat summary', () => {
  const stat = ` packages/foo/src/a.ts | 10 +++++-----\n 1 file changed, 5 insertions(+), 5 deletions(-)`;
  assert.equal(estimateChangedLines(stat), 10);
});

test('appendTaskContext includes MAIN_DAY_ISSUE when present', () => {
  const block = appendTaskContext('pr');
  assert.match(block, /MAIN_DAY_ISSUE/);
});

// ─── TF-2 (#554): --pr обязан быть числом ─────────────────────────────────────────

test('--pr с «--» → внятный отказ, а не мусор в gh', () => {
  // Живой случай 16.07: `yarn code-review:pr -- 543` → argv [--pr, --, 543] →
  // pr="--" уходил в gh → «accepts at most 1 arg(s), received 4». Звал напрямую.
  assert.throws(() => parseCodeReviewCli(['--pr', '--', '543']), /--pr должен быть числом/u);
  assert.throws(() => parseCodeReviewCli(['--pr', 'abc']), /--pr должен быть числом/u);
});

test('--pr с числом работает; подсказка про `--` в тексте отказа', () => {
  assert.equal(parseCodeReviewCli(['--pr', '543']).pr, '543');
  try {
    parseCodeReviewCli(['--pr', '--', '543']);
    assert.fail('должен был отказать');
  } catch (e) {
    assert.match(e.message, /без `--`/u, 'отказ подсказывает корень');
  }
});
