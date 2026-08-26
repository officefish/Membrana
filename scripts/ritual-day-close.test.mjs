// #1782: у утра есть ШАГ закрытия журнала, статус по факту, обрыв не теряет запись.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { dayCloseArgs, manifestCloseProblem } from './lib/ritual-day-close.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runnerSrc = readFileSync(join(ROOT, 'scripts/ritual-day-run.mjs'), 'utf8');
const manifest = JSON.parse(readFileSync(join(ROOT, 'docs/tasks/morning-ritual-steps.json'), 'utf8'));

const valueOf = (args, flag) => args[args.indexOf(flag) + 1];

test('#1782 статус закрытия — ПО ФАКТУ прогона, а не константа pass', () => {
  assert.equal(valueOf(dayCloseArgs({ outcome: 'pass' }), '--status'), 'pass');
  assert.equal(valueOf(dayCloseArgs({ outcome: 'pending-ci', tail: 'хвост' }), '--status'), 'skipped');
  assert.equal(valueOf(dayCloseArgs({ outcome: 'failed', stepId: 'angelina' }), '--status'), 'fail');
  assert.equal(valueOf(dayCloseArgs({ outcome: 'aborted' }), '--status'), 'fail');
});

test('#1782 у каждого не-pass исхода есть НАЗВАННЫЙ gap', () => {
  assert.equal(valueOf(dayCloseArgs({ outcome: 'failed', stepId: 'daily-standup' }), '--gap'), 'daily-standup');
  assert.equal(valueOf(dayCloseArgs({ outcome: 'pending-ci', tail: 't' }), '--gap'), 'deliver-to-main:pending-ci');
  assert.equal(valueOf(dayCloseArgs({ outcome: 'aborted', tail: 'boom' }), '--gap'), 'chain-aborted');
  assert.ok(!dayCloseArgs({ outcome: 'pass' }).includes('--gap'), 'у успеха gap не выдумываем');
});

test('#1782 pending-ci и обрыв несут хвост во friction, pass — нет', () => {
  assert.equal(valueOf(dayCloseArgs({ outcome: 'pending-ci', tail: 'жду CI' }), '--friction'), 'жду CI');
  assert.equal(valueOf(dayCloseArgs({ outcome: 'aborted', tail: 'цепочка оборвана: X' }), '--friction'), 'цепочка оборвана: X');
  assert.ok(!dayCloseArgs({ outcome: 'pass' }).includes('--friction'));
});

test('#1782 ПОРЧА: манифест с journal-open, но без journal-close — находка', () => {
  const problem = manifestCloseProblem([{ id: 'journal-open' }, { id: 'standup' }]);
  assert.match(problem, /journal-open без journal-close/u);
  assert.equal(manifestCloseProblem([{ id: 'journal-open' }, { id: 'journal-close' }]), null);
  assert.equal(manifestCloseProblem([{ id: 'standup' }]), null, 'чужой манифест не судим');
});

test('#1782 живой манифест утра несёт шаг закрытия, симметрично открытию', () => {
  assert.equal(manifestCloseProblem(manifest.steps), null);
  const close = manifest.steps.find((s) => s.id === 'journal-close');
  assert.equal(close.kind, 'mechanic');
  assert.equal(close.criticality, 'critical');
  assert.match(close.verify, /статус/u);
});

test('#1782 раннер закрывает через finally и не пишет дважды', () => {
  assert.match(runnerSrc, /finally \{/u, 'без finally обрыв уносит запись прогона');
  assert.match(runnerSrc, /journalClosed/u, 'повторное закрытие обязано быть немым');
  assert.match(runnerSrc, /dayCloseArgs/u, 'сборка аргументов — из lib, а не в двух копиях');
  assert.doesNotMatch(runnerSrc, /closeRun\('pass'\)[\s\S]{0,40}закрытие обязательно/u);
});
