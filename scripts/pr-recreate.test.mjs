import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planRecreate, parseArgs } from './pr-recreate.mjs';

test('planRecreate: undivergent A/M → port', () => {
  const p = planRecreate({
    files: [
      { path: 'a.md', status: 'A' },
      { path: 'b.mjs', status: 'M' },
    ],
    divergedByFile: { 'a.md': 0, 'b.mjs': 0 },
  });
  assert.deepEqual(p.port, ['a.md', 'b.mjs']);
  assert.deepEqual(p.manual, []);
});

test('planRecreate: main трогал файл → MANUAL (3-way), не port', () => {
  const p = planRecreate({
    files: [
      { path: 'a.md', status: 'M' },
      { path: 'concept.md', status: 'M' },
    ],
    divergedByFile: { 'a.md': 0, 'concept.md': 3 },
  });
  assert.deepEqual(p.port, ['a.md']);
  assert.equal(p.manual.length, 1);
  assert.equal(p.manual[0].path, 'concept.md');
});

test('planRecreate: --drop отбрасывает (протухшее), даже если undivergent', () => {
  const p = planRecreate({
    files: [
      { path: 'insight/X.md', status: 'A' },
      { path: 'comms/sent-log.jsonl', status: 'M' },
    ],
    drops: ['comms/sent-log.jsonl'],
    divergedByFile: { 'insight/X.md': 0, 'comms/sent-log.jsonl': 0 },
  });
  assert.deepEqual(p.port, ['insight/X.md']);
  assert.deepEqual(p.drop, ['comms/sent-log.jsonl']);
});

test('planRecreate: удаление в PR → del, не port', () => {
  const p = planRecreate({
    files: [{ path: 'old.md', status: 'D' }],
    divergedByFile: { 'old.md': 0 },
  });
  assert.deepEqual(p.del, ['old.md']);
  assert.deepEqual(p.port, []);
});

test('planRecreate: drop важнее divergence и статуса', () => {
  const p = planRecreate({
    files: [{ path: 'x', status: 'M' }],
    drops: ['x'],
    divergedByFile: { x: 5 },
  });
  assert.deepEqual(p.drop, ['x']);
  assert.deepEqual(p.manual, []);
  assert.deepEqual(p.port, []);
});

test('parseArgs: номер + повторный --drop + --branch + --base', () => {
  const o = parseArgs(['node', 'pr-recreate.mjs', '894', '--drop', 'a.md', '--drop', 'b.jsonl', '--branch', 'recreate/x', '--base', 'main']);
  assert.equal(o.pr, '894');
  assert.deepEqual(o.drops, ['a.md', 'b.jsonl']);
  assert.equal(o.branch, 'recreate/x');
  assert.equal(o.base, 'main');
});

test('parseArgs: без номера → pr null (main отрапортует usage)', () => {
  const o = parseArgs(['node', 'pr-recreate.mjs', '--base', 'main']);
  assert.equal(o.pr, null);
  assert.equal(o.base, 'main');
});
