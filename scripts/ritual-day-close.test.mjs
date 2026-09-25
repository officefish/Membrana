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
  // #2413 поправил ФОРМУ: хвост остался хвостом, но симптом теперь начинается с
  // предмета — иначе трение не сводится с дырой, к которой относится.
  assert.equal(valueOf(dayCloseArgs({ outcome: 'pending-ci', tail: 'жду CI' }), '--friction'), 'deliver-to-main: жду CI');
  assert.equal(
    valueOf(dayCloseArgs({ outcome: 'aborted', tail: 'цепочка оборвана: X' }), '--friction'),
    'chain-aborted: цепочка оборвана: X',
  );
  assert.ok(!dayCloseArgs({ outcome: 'pass' }).includes('--friction'));
});

// ── #2413: утро 23.09 — gaps:["daily-standup"], friction:[] ───────────────────────
//
// КРАСНЫЙ ВХОД: живая запись утра 2026-09-23 закрылась `fail` с одним gap и ПУСТЫМ
// friction. Дайджест считает непогашенные трения по friction[] и про gaps в этой графе
// молчит — отсюда «ноль трений» за утро, в котором упал стендап.
test('#2413 отказ шага утра родит трение, а не только дыру в покрытии', () => {
  const args = dayCloseArgs({ outcome: 'failed', stepId: 'daily-standup' });
  assert.equal(valueOf(args, '--gap'), 'daily-standup');
  assert.ok(args.includes('--friction'), 'gaps:["daily-standup"], friction:[] — ровно утро 23.09');
  assert.match(valueOf(args, '--friction'), /^daily-standup: отказ шага/u);
  assert.match(valueOf(args, '--friction'), /корень не назван/u, 'симптом известен, корень — нет');
});

test('#2413 обрыв БЕЗ хвоста тоже родит трение — молчание неотличимо от удачи', () => {
  const args = dayCloseArgs({ outcome: 'aborted' });
  assert.equal(valueOf(args, '--gap'), 'chain-aborted');
  assert.ok(args.includes('--friction'), 'обрыв без хвоста оставлял gap без единого симптома');
  assert.match(valueOf(args, '--friction'), /chain-aborted/u);
});

test('#2413 у неизвестного шага трение всё равно есть, под именем дыры', () => {
  const args = dayCloseArgs({ outcome: 'failed', stepId: null });
  assert.equal(valueOf(args, '--gap'), 'unknown-step');
  assert.match(valueOf(args, '--friction'), /^unknown-step: отказ шага/u);
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
