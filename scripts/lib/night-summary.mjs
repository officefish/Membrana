import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const NIGHT_SUMMARY_REPORT_REL = 'tests/reports/nightly-summary/latest.json';
export const NIGHT_SUMMARY_MARKDOWN_REL = 'tests/reports/nightly-summary/latest.md';

export const NIGHT_WORKFLOWS = Object.freeze([
  {
    id: 'network-probes',
    title: 'Network probes nightly',
    workflow: 'network-probes-nightly.yml',
    required: true,
    cron: '0 20 * * *',
  },
  {
    id: 'vitest-nightly',
    title: 'Vitest nightly',
    workflow: 'vitest-nightly.yml',
    required: true,
    cron: '0 21 * * *',
  },
  {
    id: 'tests-nightly-full',
    title: 'Tests nightly full',
    workflow: 'tests-nightly-full.yml',
    required: true,
    cron: '0 22 * * *',
  },
]);

/**
 * Опоздание расписания: сколько прошло от ОБЪЯВЛЕННОГО часа до фактического старта.
 *
 * GitHub отдаёт scheduled-прогоны не в объявленное время, а когда дойдут руки, и
 * 25.09 это стоило нам утра: ночь приходила через ~5 ч, то есть после ритуала,
 * и гейт краснел по устройству. Сдвиг расписания лечит сегодня; это число лечит
 * завтра — если задержка поплывёт, мы увидим её величину, а не будем гадать.
 *
 * Берём ближайшее объявленное срабатывание НЕ ПОЗЖЕ факта: cron ежесуточный, и
 * старт в 01:30 при объявленных 22:00 — это опоздание 3.5 ч со вчерашнего срока,
 * а не «за 20.5 ч до сегодняшнего».
 *
 * @param {string|null} cron — пятиполевой cron; поддержан суточный вид «M H * * *»
 * @param {string|null} startedAtIso
 * @returns {{ cron: string, declaredAt: string, latenessMs: number } | null}
 */
export function scheduleLateness(cron, startedAtIso) {
  if (typeof cron !== 'string' || typeof startedAtIso !== 'string') return null;
  const m = cron.trim().match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/u);
  if (!m) return null;
  const minute = Number(m[1]);
  const hour = Number(m[2]);
  if (!(minute >= 0 && minute < 60 && hour >= 0 && hour < 24)) return null;
  const started = new Date(startedAtIso);
  if (Number.isNaN(started.getTime())) return null;
  let declared = new Date(
    Date.UTC(
      started.getUTCFullYear(),
      started.getUTCMonth(),
      started.getUTCDate(),
      hour,
      minute,
      0,
      0,
    ),
  );
  if (declared.getTime() > started.getTime()) {
    declared = new Date(declared.getTime() - 86_400_000);
  }
  return {
    cron: cron.trim(),
    declaredAt: declared.toISOString(),
    latenessMs: started.getTime() - declared.getTime(),
  };
}

/** Опоздание словами: «+5 ч 07 мин». Ноль и отрицательное — «вовремя». */
export function formatLateness(latenessMs) {
  if (!Number.isFinite(latenessMs) || latenessMs <= 0) return 'вовремя';
  const totalMinutes = Math.round(latenessMs / 60_000);
  const h = Math.floor(totalMinutes / 60);
  const min = totalMinutes % 60;
  if (h === 0) return `+${min} мин`;
  return `+${h} ч ${String(min).padStart(2, '0')} мин`;
}

function normalizeRevision(value) {
  const s = String(value ?? '')
    .trim()
    .toLowerCase();
  return /^[0-9a-f]{12,40}$/u.test(s) ? s : null;
}

function sameRevision(left, right) {
  return left === right || left.startsWith(right) || right.startsWith(left);
}

function shortRev(revision) {
  return revision ? revision.slice(0, 12) : 'unknown';
}

export function readGitRevision(repoRoot, ref = 'HEAD') {
  try {
    return execFileSync('git', ['rev-parse', ref], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Знает ли локальная история этот коммит как часть ствола.
 *
 * Не предикат свежести (им был путь #2502 и он снят), а различитель причин:
 * «я не вижу коммита» — это НЕ «прогон шёл на устаревшей ссылке». Без него
 * незафетченный origin/main выглядел бы как устаревшая ночь, и ремонт («git
 * fetch») искали бы в ночи.
 *
 * @returns {boolean | null} true/false when Git answered, null when ancestry is unknown
 */
export function isGitAncestor(repoRoot, ancestor, descendant, exec = execFileSync) {
  try {
    exec('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
      cwd: repoRoot,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch (error) {
    if (error && typeof error === 'object' && error.status === 1) return false;
    return null;
  }
}

/**
 * Вершина ствола НА МОМЕНТ времени — точный предмет проверки свежести (#2504).
 *
 * Вопрос гейта не «совпадает ли ночь с вершиной сейчас» (любой утренний мердж
 * красил здоровую ночь, #2501) и не «не слишком ли она стара» (окно в часах —
 * слабый заменитель, оно пропускает ручной перезапуск на устаревшей ссылке), а
 * «была ли эта вершина текущей, когда ночь шла».
 *
 * `--before` git разбирает и ISO с `Z`, и ISO со смещением (`+03:00`) — зуб
 * «--before: Z и смещение дают один и тот же коммит» держит это утверждение.
 * Отбор идёт по дате КОММИТА (committer date), поэтому предпосылка предиката —
 * линейная первая родительская история ствола (squash-merge).
 *
 * @param {string} repoRoot
 * @param {string | null} createdAt ISO-время запуска
 * @param {string} [ref]
 * @param {typeof execFileSync} [exec]
 * @returns {string | null} SHA либо null, если история не отвечает
 */
export function readGitRevisionAt(repoRoot, createdAt, ref = 'origin/main', exec = execFileSync) {
  if (typeof createdAt !== 'string' || Number.isNaN(new Date(createdAt).getTime())) return null;
  try {
    const out = exec('git', ['rev-list', '--first-parent', '-1', `--before=${createdAt}`, ref], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return String(out).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Текущий объявленный цикл ночи: [последний объявленный час ≤ now, +24 ч).
 *
 * Здесь нет магического числа: граница взята из cron самого workflow, того же,
 * по которому считается опоздание. Прогон свежий, если он принадлежит открытому
 * циклу; прогон прошлого цикла — «ночь ещё не пришла», прогон старше — устарел.
 *
 * @param {string | null} cron
 * @param {string | null} nowIso
 * @returns {{ cron: string, start: string, next: string } | null}
 */
export function nightCycleWindow(cron, nowIso) {
  const declared = scheduleLateness(cron, nowIso ?? null);
  if (!declared) return null;
  return {
    cron: declared.cron,
    start: declared.declaredAt,
    next: new Date(Date.parse(declared.declaredAt) + 86_400_000).toISOString(),
  };
}

/**
 * ОДИН предикат свежести прогона — на двух вызывающих: сборка сводки (там есть
 * git) и гейт (там есть только записанные факты). Две реализации одного вопроса
 * расходятся молча, поэтому судит эта функция, а стороны только подают факты.
 *
 * @param {object} input
 * @param {string | null} input.headSha ссылка, на которой шёл прогон
 * @param {string | null} input.trunkRevisionAtStart вершина ствола в момент старта
 * @param {string | null} input.createdAt
 * @param {string | null} input.cron объявленный час ночного workflow
 * @param {string | null} input.now время суждения
 * @returns {{ status: 'stale'|'pending'|'invalid', reason: string } | null} null — свежий
 */
export function judgeRunFreshness({ headSha, trunkRevisionAtStart, createdAt, cron, now }) {
  const head = normalizeRevision(headSha);
  if (!head) return { status: 'stale', reason: 'у запуска нет headSha' };
  const atStart = normalizeRevision(trunkRevisionAtStart);
  if (!atStart) {
    return {
      status: 'invalid',
      reason: `вершина ствола на момент запуска не установлена — свежесть ${shortRev(head)} не проверяема`,
    };
  }
  if (!sameRevision(head, atStart)) {
    return {
      status: 'stale',
      reason: `запуск на ${shortRev(head)}, а ствол в тот момент был на ${shortRev(atStart)}`,
    };
  }
  const createdMs = Date.parse(createdAt ?? '');
  if (!Number.isFinite(createdMs)) {
    return { status: 'stale', reason: 'у запуска нет читаемого createdAt' };
  }
  const cycle = nightCycleWindow(cron, now);
  if (!cycle) {
    return {
      status: 'invalid',
      reason: 'цикл ночи не установлен: объявленный час или время чтения не разобраны',
    };
  }
  const startMs = Date.parse(cycle.start);
  if (createdMs < startMs) {
    const cyclesBack = Math.ceil((startMs - createdMs) / 86_400_000);
    if (cyclesBack <= 1) {
      return {
        status: 'pending',
        reason: `ночь текущего цикла ещё не пришла: цикл открыт ${cycle.start} (${cycle.cron}), последний запуск ${createdAt}`,
      };
    }
    return {
      status: 'stale',
      reason: `запуск ${createdAt} старше текущего цикла ночи на ${cyclesBack} сут (цикл открыт ${cycle.start})`,
    };
  }
  if (createdMs >= Date.parse(cycle.next)) {
    return {
      status: 'invalid',
      reason: `createdAt ${createdAt} впереди следующего объявленного часа (${cycle.next}) — часы расходятся`,
    };
  }
  return null;
}

/**
 * @param {object} input
 * @param {object} input.workflow объявление ночного механизма (id/title/workflow/cron)
 * @param {object | null} input.run ответ gh про последний прогон
 * @param {string | null} input.expectedRevision текущая вершина ствола (для записи и sanity)
 * @param {string} [input.generatedAt] время сборки сводки
 * @param {((createdAt: string | null) => string | null) | null} [input.trunkRevisionAt]
 *        вершина ствола на момент старта прогона; без неё свежесть не проверяема
 * @param {((sha: string) => boolean | null) | null} [input.historyHas]
 *        знает ли локальная история этот коммит как часть ствола
 */
export function classifyNightWorkflowRun({
  workflow,
  run,
  expectedRevision,
  generatedAt,
  trunkRevisionAt = null,
  historyHas = null,
}) {
  const expected = normalizeRevision(expectedRevision);
  if (!expected) {
    return {
      id: workflow.id,
      title: workflow.title,
      workflow: workflow.workflow,
      required: workflow.required !== false,
      status: 'invalid',
      reason: 'вершина ствола неизвестна',
    };
  }
  if (!run) {
    return {
      id: workflow.id,
      title: workflow.title,
      workflow: workflow.workflow,
      required: workflow.required !== false,
      status: 'missing',
      reason: 'запуск не найден',
    };
  }
  const headSha = normalizeRevision(run.headSha);
  const base = {
    id: workflow.id,
    title: workflow.title,
    workflow: workflow.workflow,
    required: workflow.required !== false,
    // Объявленный час едет в сводку всегда (не только для scheduled): по нему
    // гейт находит открытый цикл ночи, и артефакт остаётся самодостаточным.
    cron: workflow.cron ?? null,
    run: {
      databaseId: run.databaseId ?? null,
      event: run.event ?? null,
      status: run.status ?? null,
      conclusion: run.conclusion ?? null,
      createdAt: run.createdAt ?? null,
      updatedAt: run.updatedAt ?? null,
      headSha,
      trunkRevisionAtStart:
        typeof trunkRevisionAt === 'function'
          ? normalizeRevision(trunkRevisionAt(run.createdAt ?? null))
          : null,
      // Только для scheduled: у workflow_dispatch объявленного срока нет, и
      // «опоздание» там было бы выдумкой.
      schedule:
        run.event === 'schedule'
          ? scheduleLateness(workflow.cron ?? null, run.createdAt ?? null)
          : null,
    },
  };
  if (!headSha) {
    return { ...base, status: 'stale', reason: 'у запуска нет headSha' };
  }
  // Сначала — видит ли локальная история коммит вообще. Иначе неполная история
  // (незафетченный origin/main, shallow clone) соврала бы «ночь устарела».
  const known = typeof historyHas === 'function' ? historyHas(headSha) : true;
  if (known === null) {
    return {
      ...base,
      status: 'invalid',
      reason: `коммит запуска ${shortRev(headSha)} не найден в локальной истории — свежесть не проверяема (git fetch origin main)`,
    };
  }
  if (known === false) {
    return {
      ...base,
      status: 'stale',
      reason: `коммит запуска ${shortRev(headSha)} не в истории ствола ${shortRev(expected)}`,
    };
  }
  const freshness = judgeRunFreshness({
    headSha,
    trunkRevisionAtStart: base.run.trunkRevisionAtStart,
    createdAt: run.createdAt ?? null,
    cron: workflow.cron ?? null,
    now: generatedAt ?? null,
  });
  if (freshness) {
    return { ...base, ...freshness };
  }
  if (run.status !== 'completed') {
    return {
      ...base,
      status: 'pending',
      reason: `запуск ещё не завершён: ${run.status ?? 'unknown'}`,
    };
  }
  if (run.conclusion !== 'success') {
    return {
      ...base,
      status: 'red',
      reason: `conclusion=${run.conclusion ?? 'unknown'}`,
    };
  }
  return { ...base, status: 'pass', reason: 'success' };
}

export function buildNightSummary({
  generatedAt = new Date().toISOString(),
  expectedRevision,
  workflows = NIGHT_WORKFLOWS,
  runsByWorkflow = {},
  trunkRevisionAt = null,
  historyHas = null,
} = {}) {
  const checks = workflows.map((workflow) => {
    const run = runsByWorkflow[workflow.workflow] ?? runsByWorkflow[workflow.id] ?? null;
    return classifyNightWorkflowRun({
      workflow,
      run,
      expectedRevision,
      generatedAt,
      trunkRevisionAt,
      historyHas,
    });
  });
  const blockers = problemsFromChecks(checks);
  return {
    schemaVersion: 1,
    kind: 'night-summary',
    generatedAt,
    git: {
      revision: expectedRevision ?? null,
    },
    workflows: checks,
    execution: {
      status: blockers.length === 0 ? 'pass' : 'fail',
      exitCode: blockers.length === 0 ? 0 : 1,
    },
    problems: blockers,
  };
}

export function renderNightSummaryMarkdown(summary) {
  const lines = [
    '# Night summary',
    '',
    `Generated: ${summary.generatedAt}`,
    `Revision: ${summary.git?.revision ?? 'unknown'}`,
    `Execution: ${summary.execution?.status ?? 'unknown'}`,
    '',
    '| Workflow | Status | Run | Reason |',
    '| --- | --- | --- | --- |',
  ];
  for (const check of summary.workflows ?? []) {
    const runId = check.run?.databaseId ? `#${check.run.databaseId}` : '-';
    lines.push(
      `| ${check.title ?? check.id} | ${check.status} | ${runId} | ${String(check.reason ?? '').replace(/\|/gu, '\\|')} |`,
    );
  }
  if ((summary.problems ?? []).length > 0) {
    lines.push('', '## Problems', '');
    for (const problem of summary.problems) lines.push(`- ${problem}`);
  }
  return `${lines.join('\n')}\n`;
}

export function writeNightSummary(repoRoot, summary) {
  const jsonPath = join(repoRoot, NIGHT_SUMMARY_REPORT_REL);
  const mdPath = join(repoRoot, NIGHT_SUMMARY_MARKDOWN_REL);
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  writeFileSync(mdPath, renderNightSummaryMarkdown(summary), 'utf8');
  return { jsonPath, mdPath };
}

export function latestRunByWorkflow(cwd, workflow, exec = execFileSync, branch = 'main') {
  const raw = exec(
    'gh',
    [
      'run',
      'list',
      '--workflow',
      workflow.workflow,
      '--branch',
      branch,
      '--limit',
      '1',
      '--json',
      'databaseId,status,conclusion,createdAt,updatedAt,headSha,event',
    ],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const runs = JSON.parse(raw);
  if (!Array.isArray(runs) || runs.length === 0) return null;
  return runs[0];
}

export function buildNightSummaryFromGithub({
  cwd,
  expectedRevision,
  generatedAt,
  exec = execFileSync,
  gitExec = execFileSync,
  branch = 'main',
  trunkRevisionAt = null,
  historyHas = null,
} = {}) {
  const runsByWorkflow = {};
  const ghErrors = new Map();
  for (const workflow of NIGHT_WORKFLOWS) {
    try {
      runsByWorkflow[workflow.workflow] = latestRunByWorkflow(cwd, workflow, exec, branch);
    } catch (e) {
      runsByWorkflow[workflow.workflow] = null;
      ghErrors.set(
        workflow.title,
        `gh run list не отработал — ${e instanceof Error ? e.message : e}`,
      );
    }
  }
  const summary = buildNightSummary({
    generatedAt,
    expectedRevision,
    runsByWorkflow,
    trunkRevisionAt:
      trunkRevisionAt ?? ((createdAt) => readGitRevisionAt(cwd, createdAt, `origin/${branch}`, gitExec)),
    historyHas: historyHas ?? ((sha) => isGitAncestor(cwd, sha, `origin/${branch}`, gitExec)),
  });
  if (ghErrors.size > 0) {
    summary.execution = { status: 'fail', exitCode: 1 };
    for (const [title, reason] of ghErrors) {
      const check = summary.workflows.find((item) => item.title === title);
      if (check && check.status === 'missing') {
        check.reason = reason;
      }
    }
    summary.problems = problemsFromChecks(summary.workflows);
  }
  return summary;
}

function problemsFromChecks(checks) {
  return checks
    .filter((check) => check.required !== false && check.status !== 'pass')
    .map((check) => `${check.title}: ${check.reason}`);
}
