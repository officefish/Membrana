import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  defaultIssueBody,
  ensureAcceptanceSection,
  parseStartArgs,
} from './task-start.mjs';

test('parseStartArgs: dry-run / no-issue / labels', () => {
  const a = parseStartArgs([
    '--id',
    'demo-start',
    '--title',
    'Demo',
    '--size',
    'S',
    '--dry-run',
    '--no-issue',
    '--labels',
    'tooling,bug',
  ]);
  assert.equal(a.id, 'demo-start');
  assert.equal(a.dryRun, true);
  assert.equal(a.noIssue, true);
  assert.deepEqual(a.labels, ['tooling', 'bug']);
});

test('defaultIssueBody содержит Acceptance и id', () => {
  const body = defaultIssueBody({
    id: 'demo-start',
    title: 'Demo title',
    size: 'M',
    promptPath: 'docs/prompts/DEMO_START_PROMPT.md',
  });
  assert.match(body, /## Acceptance criteria/);
  assert.match(body, /demo-start/);
  assert.match(body, /task:start/);
});

test('ensureAcceptanceSection идемпотентен', () => {
  const base = '# P\n\n## Заметки для человека-постановщика\n\nx\n';
  const once = ensureAcceptanceSection(base);
  assert.match(once, /## Acceptance criteria/);
  const twice = ensureAcceptanceSection(once);
  assert.equal(twice, once);
});


test('parseStartArgs: --linear проходит в register-флаги', () => {
  const a = parseStartArgs([
    '--id', 'demo-start', '--title', 'Demo', '--size', 'S', '--linear', 'DRU-249', '--dry-run',
  ]);
  assert.equal(a.linear, 'DRU-249');
  assert.equal(a.dryRun, true);
});
