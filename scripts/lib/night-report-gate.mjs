/**
 * night-report — потребитель кадра `night-report` процедуры ritual-day (#1293).
 *
 * До этого модуля `blocksMorningWhen` в MANIFEST был декларацией без потребителя
 * («Проза» по бестиарию #1204): ночной красный никого не останавливал. Здесь
 * выражение кадра читается и исполняется: красный ИЛИ несвежий отчёт — STOP утра.
 *
 * Носитель (tests/reports/nightly-summary/latest.json) собирает одну сводку
 * ночи: что запускалось, что прошло, что упало и почему. Утро читает именно
 * сводку, а не один tests-report; иначе новый ночной механизм снова может
 * умереть невидимым.
 * Свежесть — по git revision ствола, НЕ по mtime и не по календарной дате.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

export const NIGHT_REPORT_FRAME_ID = 'night-report';
export const RITUAL_DAY_MANIFEST_REL = 'docs/procedures/ritual-day/MANIFEST.json';
/** Единственное поддержанное выражение кадра; иное — fail closed. */
export const SUPPORTED_BLOCK_EXPR = 'execution.status != pass';

/**
 * @param {string} repoRoot
 * @returns {{ frame: object | null, carrier: object | null, problems: string[] }}
 */
export function loadNightReportFrame(repoRoot) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(repoRoot, RITUAL_DAY_MANIFEST_REL), 'utf8'));
  } catch (e) {
    return { frame: null, carrier: null, problems: [`MANIFEST ritual-day: ${e.message}`] };
  }
  const frames = Array.isArray(manifest.frames) ? manifest.frames : [];
  const frame = frames.find((f) => f && f.id === NIGHT_REPORT_FRAME_ID) ?? null;
  if (!frame) {
    return { frame: null, carrier: null, problems: [`frames: нет кадра ${NIGHT_REPORT_FRAME_ID}`] };
  }
  const carrier = frame.carrier && typeof frame.carrier === 'object' ? frame.carrier : null;
  if (!carrier || typeof carrier.path !== 'string' || !carrier.path) {
    return { frame, carrier: null, problems: [`кадр ${NIGHT_REPORT_FRAME_ID}: carrier без path`] };
  }
  return { frame, carrier, problems: [] };
}

/**
 * @param {string} repoRoot
 * @param {string} rel
 * @returns {{ report: object | null, problem: string | null }}
 */
export function readNightReport(repoRoot, rel) {
  // <!-- pin:START night-report-reader -->
  // Отрезок чтения носителя — запинен кадром night-report (MANIFEST ritual-day):
  // дрейф этого места ловит auditPins, а не глаза (#1293 DoD-2).
  let text;
  try {
    text = readFileSync(join(repoRoot, rel), 'utf8');
  } catch {
    return { report: null, problem: `носителя нет: ${rel}` };
  }
  try {
    const report = JSON.parse(text);
    if (!report || typeof report !== 'object') return { report: null, problem: 'носитель не объект' };
    return { report, problem: null };
  } catch (e) {
    return { report: null, problem: `носитель не JSON: ${e.message}` };
  }
  // <!-- pin:END night-report-reader -->
}

/**
 * Чистая оценка утреннего гейта ночи. Три различимых блокера (#1293 DoD-3/4):
 * missing/stale — «ночь не отработала» (каждый своим текстом), red — красный ночи.
 *
 * @param {object} input
 * @param {object | null} input.carrier декларация кадра (blocksMorningWhen)
 * @param {object | null} input.report содержимое носителя
 * @param {string | null} [input.reportProblem]
 * @param {string} input.expectedRevision 40-char SHA or prefix of target origin/main
 * @param {string} [input.today] legacy/log-only day; freshness is not decided by calendar date
 * @returns {{ status: 'pass'|'missing'|'stale'|'red'|'invalid', blockers: string[], summary: string[] }}
 */
export function evaluateNightReport({ carrier, report, reportProblem = null, expectedRevision, today = null }) {
  /** @type {string[]} */
  const summary = [];
  const expr = typeof carrier?.blocksMorningWhen === 'string' ? carrier.blocksMorningWhen : '';
  if (expr !== SUPPORTED_BLOCK_EXPR) {
    return {
      status: 'invalid',
      blockers: [
        `кадр объявил blocksMorningWhen «${expr || '—'}», потребитель поддерживает только «${SUPPORTED_BLOCK_EXPR}» — fail closed`,
      ],
      summary,
    };
  }
  if (!report) {
    return {
      status: 'missing',
      blockers: [`ночь не отработала: ${reportProblem ?? 'носителя нет'}`],
      summary,
    };
  }
  const generatedAt = typeof report.generatedAt === 'string' ? report.generatedAt : '';
  const reportDay = generatedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(reportDay)) {
    return {
      status: 'missing',
      blockers: ['ночь не отработала: у носителя нет читаемого generatedAt'],
      summary,
    };
  }
  summary.push(`отчёт: ${generatedAt}`);
  if (today) summary.push(`день чтения: ${today}`);
  const reportRevision = normalizeRevision(report.git?.revision ?? report.revision ?? report.headSha);
  const wantedRevision = normalizeRevision(expectedRevision);
  if (!wantedRevision) {
    return {
      status: 'invalid',
      blockers: ['ночь не отработала: нельзя установить вершину ствола для проверки свежести'],
      summary,
    };
  }
  summary.push(`вершина ствола: ${wantedRevision}`);
  if (!reportRevision) {
    return {
      status: 'stale',
      blockers: ['ночь не отработала: у носителя нет ревизии git — свежесть по вершине ствола не подтверждена'],
      summary,
    };
  }
  summary.push(`ревизия отчёта: ${reportRevision}`);
  if (!sameRevision(reportRevision, wantedRevision)) {
    return {
      status: 'stale',
      blockers: [
        `ночь не на текущем стволе: отчёт ${shortRev(reportRevision)}, ожидается ${shortRev(wantedRevision)} — календарная дата больше не решает свежесть`,
      ],
      summary,
    };
  }
  const setup = report.setup && typeof report.setup === 'object' ? report.setup : {};
  const notRun = Array.isArray(setup.notRun) ? setup.notRun.length : null;
  const run = Array.isArray(setup.run) ? setup.run.length : null;
  if (run !== null) summary.push(`гонялось файлов: ${run}`);
  if (notRun !== null) summary.push(`не гонялось: ${notRun}`);
  if (report.kit?.id) summary.push(`кит: ${report.kit.id} (${report.kit.ok ? 'pinned ok' : 'pinned BLOCKED'})`);
  const summaryVerdict = evaluateNightSummary(report);
  if (summaryVerdict) {
    for (const line of summaryVerdict.summary) summary.push(line);
    if (summaryVerdict.blockers.length > 0) {
      return {
        status: summaryVerdict.status,
        blockers: summaryVerdict.blockers,
        summary,
      };
    }
  }
  // Исполнение выражения кадра — «execution.status != pass».
  const status = report.execution?.status;
  if (status !== 'pass') {
    const exitCode = report.execution?.exitCode;
    const problems = Array.isArray(report.problems) ? report.problems.length : 0;
    return {
      status: 'red',
      blockers: [
        `ночной красный: execution.status=${String(status)}${exitCode == null ? '' : ` (exit ${exitCode})`}${problems ? ` · problems: ${problems}` : ''} — утро не идёт дальше без разбора`,
      ],
      summary,
    };
  }
  return { status: 'pass', blockers: [], summary };
}

function evaluateNightSummary(report) {
  if (report.kind !== 'night-summary') return null;
  const checks = Array.isArray(report.workflows) ? report.workflows : [];
  const lines = checks.map((check) => {
    const title = check.title ?? check.id ?? check.workflow ?? 'unknown';
    const status = check.status ?? 'unknown';
    const reason = check.reason ? ` — ${check.reason}` : '';
    return `ночь/${title}: ${status}${reason}`;
  });
  if (checks.length === 0) {
    return {
      status: 'invalid',
      blockers: ['ночная сводка пуста: ни один ночной механизм не назван'],
      summary: lines,
    };
  }
  const blockers = checks
    .filter((check) => check.required !== false && check.status !== 'pass')
    .map((check) => {
      const title = check.title ?? check.id ?? check.workflow ?? 'unknown';
      return `ночной механизм не прошёл: ${title} — ${check.status ?? 'unknown'}${check.reason ? ` (${check.reason})` : ''}`;
    });
  if (blockers.length === 0) return { status: 'pass', blockers: [], summary: lines };
  const first = checks.find((check) => check.required !== false && check.status !== 'pass');
  const status = ['missing', 'stale', 'red', 'invalid'].includes(first?.status) ? first.status : 'red';
  return { status, blockers, summary: lines };
}

function normalizeRevision(value) {
  const s = String(value ?? '').trim().toLowerCase();
  return /^[0-9a-f]{12,40}$/u.test(s) ? s : null;
}

function sameRevision(left, right) {
  return left === right || left.startsWith(right) || right.startsWith(left);
}

function shortRev(revision) {
  return revision ? revision.slice(0, 12) : 'unknown';
}

function readGitRevision(repoRoot, ref) {
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
 * Печать + код выхода для morning-care: 0 — зелёная свежая ночь; 2 — STOP.
 *
 * @param {string} repoRoot
 * @param {{ log?: (s: string) => void, today?: string, expectedRevision?: string, expectedRef?: string }} [opts]
 * @returns {number}
 */
export function runNightReportGate(repoRoot, opts = {}) {
  const log = opts.log ?? console.log;
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const expectedRef = opts.expectedRef ?? 'origin/main';
  const expectedRevision = opts.expectedRevision ?? readGitRevision(repoRoot, expectedRef) ?? readGitRevision(repoRoot, 'HEAD');
  log('→ night-report (гейт ночи, #1293)');
  const { carrier, problems } = loadNightReportFrame(repoRoot);
  if (!carrier) {
    for (const p of problems) log(`  ✗ ${p}`);
    log('✗ night-report: STOP — кадр без носителя в MANIFEST.');
    return 2;
  }
  const { report, problem } = readNightReport(repoRoot, carrier.path);
  const verdict = evaluateNightReport({ carrier, report, reportProblem: problem, today, expectedRevision });
  for (const s of verdict.summary) log(`  · ${s}`);
  if (verdict.status === 'pass') {
    log('✓ night-report: ночь зелёная и совпадает с вершиной ствола');
    return 0;
  }
  for (const b of verdict.blockers) log(`  ✗ ${b}`);
  log(
    `✗ night-report: STOP (${verdict.status}) — ремонт: yarn night-report:gate --pull (подтянуть ночь), разбор красного — до продолжения утра.`,
  );
  return 2;
}
