#!/usr/bin/env node

console.error([
  'legacy migration is intentionally owner-gated',
  '',
  'Use this sequence:',
  '1. export legacy docs/tasks/archive records into task-closure-record/1 JSON files',
  '2. review proof completeness for every record',
  '3. post records through scripts/task-archive-notary-smoke.mjs',
  '4. write a checkpoint with scripts/task-archive-checkpoint.mjs',
  '',
  'No bulk repository import runs without a reviewed manifest.',
].join('\n'));
process.exitCode = 1;
