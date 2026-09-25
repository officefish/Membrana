import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  NIGHT_WORKFLOWS,
  buildNightSummary,
  buildNightSummaryFromGithub,
  formatLateness,
  renderNightSummaryMarkdown,
  scheduleLateness,
} from './lib/night-summary.mjs';

const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

function run(overrides = {}) {
  return {
    databaseId: 42,
    event: 'schedule',
    status: 'completed',
    conclusion: 'success',
    createdAt: '2026-08-30T03:41:00Z',
    updatedAt: '2026-08-30T03:43:00Z',
    headSha: HEAD,
    ...overrides,
  };
}

test('buildNightSummary: все ночные workflow на вершине ствола дают одну зелёную сводку', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-08-30T07:00:00.000Z',
    expectedRevision: HEAD,
    workflows: [
      { id: 'a', title: 'A', workflow: 'a.yml', required: true },
      { id: 'b', title: 'B', workflow: 'b.yml', required: true },
    ],
    runsByWorkflow: {
      'a.yml': run({ databaseId: 1 }),
      'b.yml': run({ databaseId: 2 }),
    },
  });

  assert.equal(summary.kind, 'night-summary');
  assert.equal(summary.execution.status, 'pass');
  assert.equal(summary.workflows.length, 2);
  assert.deepEqual(summary.problems, []);
  assert.match(renderNightSummaryMarkdown(summary), /A \| pass/u);
});

test('buildNightSummary: чужая вершина и красный workflow видны в одном файле', () => {
  const summary = buildNightSummary({
    expectedRevision: HEAD,
    workflows: [
      { id: 'stale', title: 'Stale', workflow: 'stale.yml', required: true },
      { id: 'red', title: 'Red', workflow: 'red.yml', required: true },
    ],
    runsByWorkflow: {
      'stale.yml': run({ headSha: OTHER }),
      'red.yml': run({ conclusion: 'failure' }),
    },
  });

  assert.equal(summary.execution.status, 'fail');
  assert.equal(summary.workflows[0].status, 'stale');
  assert.equal(summary.workflows[1].status, 'red');
  assert.match(summary.problems.join('\n'), /Stale: запуск на bbbbbbbbbbbb/u);
  assert.match(summary.problems.join('\n'), /Red: conclusion=failure/u);
});

test('buildNightSummary: неизвестная вершина ствола не маскируется missing-прогоном', () => {
  const summary = buildNightSummary({
    expectedRevision: null,
    workflows: [{ id: 'a', title: 'A', workflow: 'a.yml', required: true }],
    runsByWorkflow: {},
  });

  assert.equal(summary.execution.status, 'fail');
  assert.equal(summary.workflows[0].status, 'invalid');
  assert.match(summary.workflows[0].reason, /вершина ствола неизвестна/u);
  assert.match(summary.problems.join('\n'), /A: вершина ствола неизвестна/u);
});

test('buildNightSummaryFromGithub: gh-сбой становится видимым пунктом сводки', () => {
  const summary = buildNightSummaryFromGithub({
    cwd: process.cwd(),
    expectedRevision: HEAD,
    exec: (_cmd, args) => {
      if (args.includes('vitest-nightly.yml')) throw new Error('api down');
      return JSON.stringify([
        run({ databaseId: args.includes('network-probes-nightly.yml') ? 10 : 11 }),
      ]);
    },
  });

  const vitest = summary.workflows.find((item) => item.workflow === 'vitest-nightly.yml');
  assert.equal(summary.execution.status, 'fail');
  assert.equal(vitest.status, 'missing');
  assert.match(vitest.reason, /gh run list не отработал/u);
  assert.equal(summary.problems.length, 1);
  assert.match(renderNightSummaryMarkdown(summary), /Vitest nightly \| missing/u);
});

test('buildNightSummaryFromGithub: ветка GitHub Actions передаётся явно', () => {
  const calls = [];
  const summary = buildNightSummaryFromGithub({
    cwd: process.cwd(),
    expectedRevision: HEAD,
    branch: 'release/night',
    exec: (_cmd, args) => {
      calls.push(args);
      return JSON.stringify([run()]);
    },
  });

  assert.equal(summary.execution.status, 'pass');
  assert.equal(calls.length, 3);
  for (const args of calls) {
    assert.equal(args[args.indexOf('--branch') + 1], 'release/night');
  }
});

// ─── опоздание расписания (магистраль 25.09: ночь приходила после утра) ───────────

test('scheduleLateness: объявлено 22:00, пришло 03:07 — это +5 ч 07 мин со вчерашнего срока', () => {
  const late = scheduleLateness('0 22 * * *', '2026-09-25T03:07:00Z');
  assert.equal(late.declaredAt, '2026-09-24T22:00:00.000Z');
  assert.equal(late.latenessMs, (5 * 60 + 7) * 60_000);
  assert.equal(formatLateness(late.latenessMs), '+5 ч 07 мин');
});

test('scheduleLateness: старт позже объявленного часа в тот же день', () => {
  const late = scheduleLateness('30 1 * * *', '2026-09-25T06:00:00Z');
  assert.equal(late.declaredAt, '2026-09-25T01:30:00.000Z');
  assert.equal(formatLateness(late.latenessMs), '+4 ч 30 мин');
});

test('scheduleLateness: срок берётся НЕ позже факта — иначе опоздание станет «почти сутками»', () => {
  // Объявлено 22:00, старт 22:05 — это пять минут, а не «минус 23:55».
  assert.equal(scheduleLateness('0 22 * * *', '2026-09-25T22:05:00Z').latenessMs, 5 * 60_000);
});

test('scheduleLateness: несуточный cron и мусор — null, а не выдуманное число', () => {
  assert.equal(scheduleLateness('0 22 * * 1', '2026-09-25T03:00:00Z'), null);
  assert.equal(scheduleLateness('*/15 * * * *', '2026-09-25T03:00:00Z'), null);
  assert.equal(scheduleLateness('0 99 * * *', '2026-09-25T03:00:00Z'), null);
  assert.equal(scheduleLateness('0 22 * * *', 'не дата'), null);
  assert.equal(scheduleLateness(null, '2026-09-25T03:00:00Z'), null);
});

test('formatLateness: ноль и отрицательное — «вовремя», меньше часа — только минуты', () => {
  assert.equal(formatLateness(0), 'вовремя');
  assert.equal(formatLateness(-60_000), 'вовремя');
  assert.equal(formatLateness(7 * 60_000), '+7 мин');
});

test('сводка несёт замер опоздания для scheduled и НЕ несёт для ручного запуска', () => {
  const byWorkflow = Object.fromEntries(
    NIGHT_WORKFLOWS.map((w) => [w.workflow, run({ createdAt: '2026-09-25T03:00:00Z' })]),
  );
  const scheduled = buildNightSummary({ expectedRevision: HEAD, runsByWorkflow: byWorkflow });
  for (const check of scheduled.workflows) {
    assert.ok(check.run.schedule, `${check.id}: у ночного механизма нет замера опоздания`);
    assert.ok(check.run.schedule.latenessMs > 0);
  }

  const manual = buildNightSummary({
    expectedRevision: HEAD,
    runsByWorkflow: Object.fromEntries(
      NIGHT_WORKFLOWS.map((w) => [w.workflow, run({ event: 'workflow_dispatch' })]),
    ),
  });
  for (const check of manual.workflows) {
    // У ручного запуска объявленного срока нет — «опоздание» было бы выдумкой.
    assert.equal(check.run.schedule, null);
  }
});

test('дрейф: объявленный cron совпадает с тем, что стоит в самом workflow', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  for (const workflow of NIGHT_WORKFLOWS) {
    const file = resolve(root, '.github/workflows', workflow.workflow);
    // Сначала предмет, потом сравнение: при переносе файла тест обязан сказать
    // «нет файла по пути X», а не упасть на чтении и соврать о дрейфе (#2435).
    assert.ok(existsSync(file), `workflow не найден по пути ${file}`);
    const yml = readFileSync(file, 'utf8');
    const declared = yml.match(/^\s*-\s*cron:\s*'([^']+)'/mu);
    assert.ok(declared, `в ${workflow.workflow} не найдено расписание`);
    assert.equal(
      workflow.cron,
      declared[1],
      `${workflow.workflow}: сводка объявляет «${workflow.cron}», workflow — «${declared[1]}»`,
    );
  }
});

test('ночь объявлена ДО утреннего ритуала даже с пятичасовым опозданием', () => {
  // Ритуал начинается ~04:30 UTC. Замеры 21–25.09: задержка ~5 ч ± 20 мин,
  // берём с запасом 6 ч. Объявленный час + 6 ч обязан уложиться до 04:30 UTC.
  const RITUAL_UTC_MINUTES = 4 * 60 + 30;
  const WORST_DELAY_MINUTES = 6 * 60;
  for (const workflow of NIGHT_WORKFLOWS) {
    const m = workflow.cron.match(/^(\d{1,2})\s+(\d{1,2})\s/u);
    const declaredMinutes = Number(m[2]) * 60 + Number(m[1]);
    // Объявление вечернее (>= 12:00 UTC) — приход в следующие сутки.
    const arrival = declaredMinutes + WORST_DELAY_MINUTES - 24 * 60;
    assert.ok(
      arrival > 0 && arrival <= RITUAL_UTC_MINUTES,
      `${workflow.workflow}: при худшей задержке ночь придёт в ${arrival} мин суток, ритуал читает в ${RITUAL_UTC_MINUTES}`,
    );
  }
});
