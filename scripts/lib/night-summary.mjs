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

export function classifyNightWorkflowRun({ workflow, run, expectedRevision }) {
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
    run: {
      databaseId: run.databaseId ?? null,
      event: run.event ?? null,
      status: run.status ?? null,
      conclusion: run.conclusion ?? null,
      createdAt: run.createdAt ?? null,
      updatedAt: run.updatedAt ?? null,
      headSha,
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
  if (!sameRevision(headSha, expected)) {
    return {
      ...base,
      status: 'stale',
      reason: `запуск на ${shortRev(headSha)}, ожидается ${shortRev(expected)}`,
    };
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
} = {}) {
  const checks = workflows.map((workflow) => {
    const run = runsByWorkflow[workflow.workflow] ?? runsByWorkflow[workflow.id] ?? null;
    return classifyNightWorkflowRun({ workflow, run, expectedRevision });
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
  branch = 'main',
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
  const summary = buildNightSummary({ generatedAt, expectedRevision, runsByWorkflow });
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
