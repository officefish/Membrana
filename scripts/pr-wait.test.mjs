import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyChecks, explainNoChecks } from './pr-wait.mjs';

test('пустой rollup — none, не green (корень #643: no checks ≠ зелено)', () => {
  assert.equal(classifyChecks([]).state, 'none');
  assert.equal(classifyChecks(null).state, 'none');
  assert.equal(classifyChecks(undefined).state, 'none');
});

test('незавершённый CheckRun — running', () => {
  const r = classifyChecks([
    { name: 'CI', status: 'IN_PROGRESS', conclusion: '' },
    { name: 'lint', status: 'COMPLETED', conclusion: 'SUCCESS' },
  ]);
  assert.equal(r.state, 'running');
  assert.deepEqual(r.pending, ['CI']);
});

test('все success/skipped/neutral — green', () => {
  const r = classifyChecks([
    { name: 'CI', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'optional', status: 'COMPLETED', conclusion: 'SKIPPED' },
    { name: 'info', status: 'COMPLETED', conclusion: 'NEUTRAL' },
  ]);
  assert.equal(r.state, 'green');
  assert.equal(r.ok, 3);
});

test('смесь success + failure — red', () => {
  const r = classifyChecks([
    { name: 'CI', status: 'COMPLETED', conclusion: 'SUCCESS' },
    { name: 'test', status: 'COMPLETED', conclusion: 'FAILURE' },
  ]);
  assert.equal(r.state, 'red');
  assert.deepEqual(r.failing, ['test: FAILURE']);
});

test('red приоритетнее running: упавший чек не станет зелёным от ожидания', () => {
  const r = classifyChecks([
    { name: 'test', status: 'COMPLETED', conclusion: 'TIMED_OUT' },
    { name: 'build', status: 'QUEUED', conclusion: '' },
  ]);
  assert.equal(r.state, 'red');
});

test('StatusContext (state вместо status/conclusion) классифицируется', () => {
  assert.equal(classifyChecks([{ context: 'dc', state: 'SUCCESS' }]).state, 'green');
  assert.equal(classifyChecks([{ context: 'dc', state: 'PENDING' }]).state, 'running');
  assert.equal(classifyChecks([{ context: 'dc', state: 'ERROR' }]).state, 'red');
});

test('неизвестный вердикт не считается успехом', () => {
  const r = classifyChecks([{ name: 'x', status: 'COMPLETED', conclusion: 'MYSTERY' }]);
  assert.equal(r.state, 'running');
});

test('explainNoChecks при CONFLICTING называет причину и действие (#643 п.2)', () => {
  const msg = explainNoChecks({ mergeable: 'CONFLICTING', mergeStateStatus: 'DIRTY' });
  assert.match(msg, /конфликтует/);
  assert.match(msg, /CI не запускается/);
  assert.match(msg, /разрешить конфликт/);
});

test('explainNoChecks без конфликта: none — это НЕ зелено', () => {
  const msg = explainNoChecks({ mergeable: 'MERGEABLE', mergeStateStatus: 'CLEAN' });
  assert.match(msg, /НЕ зелено/);
});
