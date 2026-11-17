import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  NIGHT_WORKFLOWS,
  buildNightSummary,
  buildNightSummaryFromGithub,
  formatLateness,
  nightCycleWindow,
  readGitRevisionAt,
  renderNightSummaryMarkdown,
  scheduleLateness,
} from './lib/night-summary.mjs';

const HEAD = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const CURRENT = 'cccccccccccccccccccccccccccccccccccccccc';
/** Объявленный час ночного механизма в фикстурах; цикл ночи считается от него. */
const CRON = '0 22 * * *';

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

/** Ночной механизм фикстуры: у него ВСЕГДА есть объявленный час. */
function wf(id, overrides = {}) {
  return {
    id,
    title: id.toUpperCase(),
    workflow: `${id}.yml`,
    required: true,
    cron: CRON,
    ...overrides,
  };
}

test('buildNightSummary: все ночные workflow на вершине ствола дают одну зелёную сводку', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-08-30T07:00:00.000Z',
    expectedRevision: HEAD,
    workflows: [wf('a'), wf('b')],
    runsByWorkflow: {
      'a.yml': run({ databaseId: 1 }),
      'b.yml': run({ databaseId: 2 }),
    },
    trunkRevisionAt: () => HEAD,
    historyHas: () => true,
  });

  assert.equal(summary.kind, 'night-summary');
  assert.equal(summary.execution.status, 'pass');
  assert.equal(summary.workflows.length, 2);
  assert.deepEqual(summary.problems, []);
  assert.match(renderNightSummaryMarkdown(summary), /A \| pass/u);
});

test('buildNightSummary: устаревшая при старте вершина и красный workflow видны в одном файле', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-08-30T07:00:00.000Z',
    expectedRevision: HEAD,
    workflows: [wf('stale'), wf('red')],
    runsByWorkflow: {
      'stale.yml': run({ headSha: OTHER }),
      'red.yml': run({ conclusion: 'failure' }),
    },
    trunkRevisionAt: () => HEAD,
    historyHas: () => true,
  });

  assert.equal(summary.execution.status, 'fail');
  assert.equal(summary.workflows[0].status, 'stale');
  assert.equal(summary.workflows[1].status, 'red');
  assert.match(
    summary.problems.join('\n'),
    /STALE: запуск на bbbbbbbbbbbb, а ствол в тот момент был на aaaaaaaaaaaa/u,
  );
  assert.match(summary.problems.join('\n'), /RED: conclusion=failure/u);
});

// ─── две обязательные порчи точного предиката (#2501 → #2504) ──────────────────

test('ПОРЧА 1: ночь на вершине, бывшей текущей в момент прогона, зелёная — ствол ушёл вперёд', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-09-28T10:30:00.000Z',
    expectedRevision: CURRENT,
    workflows: [wf('night')],
    runsByWorkflow: {
      'night.yml': run({ headSha: HEAD, createdAt: '2026-09-28T00:14:19.000Z' }),
    },
    // В момент запуска вершиной был HEAD; сейчас — CURRENT.
    trunkRevisionAt: () => HEAD,
    historyHas: () => true,
  });

  assert.equal(summary.workflows[0].status, 'pass');
  assert.equal(summary.workflows[0].run.trunkRevisionAtStart, HEAD);
  assert.equal(summary.execution.status, 'pass');
});

test('ПОРЧА 2: ручной перезапуск на устаревшей ссылке — КРАСНЫЙ, хотя прогон свежий по времени', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-09-28T10:30:00.000Z',
    expectedRevision: CURRENT,
    workflows: [wf('night')],
    runsByWorkflow: {
      'night.yml': run({
        event: 'workflow_dispatch',
        // Перезапущено руками ночью, но на позавчерашней ссылке.
        headSha: OTHER,
        createdAt: '2026-09-28T00:14:19.000Z',
      }),
    },
    // В момент этого запуска ствол уже стоял на HEAD, а не на OTHER.
    trunkRevisionAt: () => HEAD,
    historyHas: () => true,
  });

  assert.equal(summary.workflows[0].status, 'stale');
  assert.match(summary.workflows[0].reason, /в тот момент был на aaaaaaaaaaaa/u);
  assert.equal(summary.execution.status, 'fail');
});

// ─── свежесть по открытому циклу ночи: без неё точный предикат пропускает старьё ──

test('ПОРЧА 3: позавчерашняя ночь на своей тогдашней вершине — КРАСНЫЙ по циклу ночи', () => {
  // Точному предикату эта ночь безупречна: она шла на вершине своего времени.
  // Отдельный вопрос — «та ли это ночь»: прогон 26.09 не принадлежит циклу,
  // открытому 27.09 в 22:00. Без этого зуба гейт зеленел бы на ночи, которой
  // сегодня не было.
  const summary = buildNightSummary({
    generatedAt: '2026-09-28T10:30:00.000Z',
    expectedRevision: CURRENT,
    workflows: [wf('night')],
    runsByWorkflow: {
      'night.yml': run({ headSha: OTHER, createdAt: '2026-09-26T00:14:19.000Z' }),
    },
    trunkRevisionAt: () => OTHER,
    historyHas: () => true,
  });

  assert.equal(summary.workflows[0].status, 'stale');
  assert.match(summary.workflows[0].reason, /старше текущего цикла ночи на 2 сут/u);
  assert.equal(summary.execution.status, 'fail');
});

test('прогон прошлого цикла — «ночь ещё не пришла» (pending), а не «устарела»', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-09-28T10:30:00.000Z',
    expectedRevision: CURRENT,
    workflows: [wf('night')],
    runsByWorkflow: {
      'night.yml': run({ headSha: OTHER, createdAt: '2026-09-27T00:14:19.000Z' }),
    },
    trunkRevisionAt: () => OTHER,
    historyHas: () => true,
  });

  assert.equal(summary.workflows[0].status, 'pending');
  assert.match(summary.workflows[0].reason, /ночь текущего цикла ещё не пришла/u);
});

test('опоздание GitHub не делает ночь несвежей: старт +6 ч от объявленного часа', () => {
  // Замеры 21–25.09: задержка ~5 ч. Цикл открыт объявленным часом и длится
  // сутки, поэтому любое опоздание внутри суток остаётся свежестью.
  const summary = buildNightSummary({
    generatedAt: '2026-09-28T07:30:00.000Z',
    expectedRevision: CURRENT,
    workflows: [wf('night')],
    runsByWorkflow: {
      'night.yml': run({ headSha: OTHER, createdAt: '2026-09-28T04:00:00.000Z' }),
    },
    trunkRevisionAt: () => OTHER,
    historyHas: () => true,
  });

  assert.equal(summary.workflows[0].status, 'pass');
  assert.equal(summary.workflows[0].run.schedule.latenessMs, 6 * 3_600_000);
});

test('createdAt впереди следующего объявленного часа — расхождение часов, не свежесть', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-09-28T10:30:00.000Z',
    expectedRevision: CURRENT,
    workflows: [wf('night')],
    runsByWorkflow: {
      'night.yml': run({ headSha: OTHER, createdAt: '2026-09-30T00:14:19.000Z' }),
    },
    trunkRevisionAt: () => OTHER,
    historyHas: () => true,
  });

  assert.equal(summary.workflows[0].status, 'invalid');
  assert.match(summary.workflows[0].reason, /часы расходятся/u);
});

// ─── риск точного предиката: он опирается на локальную историю git ─────────────

test('неполная локальная история — invalid с ремонтом «git fetch», а НЕ «ночь устарела»', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-09-28T10:30:00.000Z',
    expectedRevision: CURRENT,
    workflows: [wf('night')],
    runsByWorkflow: {
      'night.yml': run({ headSha: OTHER, createdAt: '2026-09-28T00:14:19.000Z' }),
    },
    // git не знает коммита: незафетченный origin/main или shallow clone.
    trunkRevisionAt: () => null,
    historyHas: () => null,
  });

  assert.equal(summary.workflows[0].status, 'invalid');
  assert.match(summary.workflows[0].reason, /не найден в локальной истории/u);
  assert.match(summary.workflows[0].reason, /git fetch origin main/u);
});

test('коммит запуска вне истории ствола — stale своим текстом', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-09-28T10:30:00.000Z',
    expectedRevision: CURRENT,
    workflows: [wf('night')],
    runsByWorkflow: {
      'night.yml': run({ headSha: OTHER, createdAt: '2026-09-28T00:14:19.000Z' }),
    },
    trunkRevisionAt: () => HEAD,
    historyHas: () => false,
  });

  assert.equal(summary.workflows[0].status, 'stale');
  assert.match(summary.workflows[0].reason, /не в истории ствола/u);
});

test('без вершины ствола на момент запуска сводка НЕ зеленеет — fail closed', () => {
  // Умолчания «сравнить с текущей вершиной» здесь нет намеренно: именно такое
  // тихое умолчание и есть дефект #2501, только спрятанный в подпись функции.
  const summary = buildNightSummary({
    generatedAt: '2026-08-30T07:00:00.000Z',
    expectedRevision: HEAD,
    workflows: [wf('night')],
    runsByWorkflow: { 'night.yml': run() },
  });

  assert.equal(summary.workflows[0].status, 'invalid');
  assert.match(summary.workflows[0].reason, /вершина ствола на момент запуска не установлена/u);
});

test('нет объявленного часа — цикл ночи не установлен, сводка не зеленеет', () => {
  const summary = buildNightSummary({
    generatedAt: '2026-08-30T07:00:00.000Z',
    expectedRevision: HEAD,
    workflows: [wf('night', { cron: null })],
    runsByWorkflow: { 'night.yml': run() },
    trunkRevisionAt: () => HEAD,
    historyHas: () => true,
  });

  assert.equal(summary.workflows[0].status, 'invalid');
  assert.match(summary.workflows[0].reason, /цикл ночи не установлен/u);
});

test('nightCycleWindow: цикл открыт объявленным часом и длится сутки', () => {
  const cycle = nightCycleWindow('0 22 * * *', '2026-09-28T10:30:00.000Z');
  assert.equal(cycle.start, '2026-09-27T22:00:00.000Z');
  assert.equal(cycle.next, '2026-09-28T22:00:00.000Z');
  assert.equal(nightCycleWindow('*/5 * * * *', '2026-09-28T10:30:00.000Z'), null);
  assert.equal(nightCycleWindow('0 22 * * *', null), null);
});

test('buildNightSummary: неизвестная вершина ствола не маскируется missing-прогоном', () => {
  const summary = buildNightSummary({
    expectedRevision: null,
    workflows: [wf('a', { title: 'A' })],
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
    generatedAt: '2026-08-30T07:00:00.000Z',
    expectedRevision: HEAD,
    trunkRevisionAt: () => HEAD,
    historyHas: () => true,
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
    generatedAt: '2026-08-30T07:00:00.000Z',
    expectedRevision: HEAD,
    branch: 'release/night',
    trunkRevisionAt: () => HEAD,
    historyHas: () => true,
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

// ─── риск точного предиката на живом git: разбор времени и неполная история ────

/** Настоящий репозиторий с заданными датами КОММИТОВ — предмет для --before. */
function tempTrunk() {
  const root = mkdtempSync(join(tmpdir(), 'tw-night-trunk-'));
  const git = (args, when) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: when ?? '',
        GIT_COMMITTER_DATE: when ?? '',
        GIT_AUTHOR_NAME: 'zub',
        GIT_AUTHOR_EMAIL: 'zub@example.invalid',
        GIT_COMMITTER_NAME: 'zub',
        GIT_COMMITTER_EMAIL: 'zub@example.invalid',
      },
    }).trim();
  git(['init', '--initial-branch=main', '--quiet']);
  const shas = [];
  for (const [i, when] of [
    '2026-09-26T12:00:00+0000',
    '2026-09-27T12:00:00+0000',
    '2026-09-28T12:00:00+0000',
  ].entries()) {
    writeFileSync(join(root, `f${i}.txt`), String(i), 'utf8');
    git(['add', `f${i}.txt`], when);
    git(['commit', '-m', `c${i}`, '--quiet'], when);
    shas.push(git(['rev-parse', 'HEAD'], when));
  }
  return { root, shas };
}

test('readGitRevisionAt: вершина НА МОМЕНТ времени — та, что была тогда, а не сегодняшняя', () => {
  const { root, shas } = tempTrunk();
  assert.equal(readGitRevisionAt(root, '2026-09-27T20:00:00Z', 'main'), shas[1]);
  assert.equal(readGitRevisionAt(root, '2026-09-28T20:00:00Z', 'main'), shas[2]);
});

test('readGitRevisionAt: Z и смещение +03:00 — один и тот же момент, один и тот же коммит', () => {
  // Риск точного предиката: время прогона может прийти не в UTC. git разбирает
  // ISO со смещением, и 27-го 23:00+03:00 — это 20:00Z, то есть та же вершина.
  const { root, shas } = tempTrunk();
  assert.equal(readGitRevisionAt(root, '2026-09-27T23:00:00+03:00', 'main'), shas[1]);
  assert.equal(
    readGitRevisionAt(root, '2026-09-27T23:00:00+03:00', 'main'),
    readGitRevisionAt(root, '2026-09-27T20:00:00Z', 'main'),
  );
  // Смещение решает, а не совпадение цифр: 27-го 12:30+03:00 = 09:30Z — вершина ещё предыдущая.
  assert.equal(readGitRevisionAt(root, '2026-09-27T12:30:00+03:00', 'main'), shas[0]);
});

test('readGitRevisionAt: до первого коммита, чужая ссылка и мусор — null, а не выдуманный SHA', () => {
  const { root } = tempTrunk();
  assert.equal(readGitRevisionAt(root, '2026-09-25T00:00:00Z', 'main'), null);
  assert.equal(readGitRevisionAt(root, '2026-09-27T20:00:00Z', 'origin/main'), null);
  assert.equal(readGitRevisionAt(root, 'не дата', 'main'), null);
  assert.equal(readGitRevisionAt(root, null, 'main'), null);
});
