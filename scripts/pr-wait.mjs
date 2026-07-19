#!/usr/bin/env node
/**
 * pr:wait — честное ожидание проверок PR (#643 п.1).
 *
 * Различает ЧЕТЫРЕ состояния и никогда их не схлопывает:
 *   none    — проверок нет (это НЕ зелено; при CONFLICTING CI не запустится вовсе)
 *   running — проверки идут
 *   green   — все завершились успехом (success / skipped / neutral)
 *   red     — есть failure / error / cancelled / timed_out / action_required
 *
 * Эпизод-корень: цикл `gh pr checks N | grep -c pending` на ответе
 * «no checks reported» дал 0 совпадений → агент доложил зелёный CI, которого
 * не было. Здесь состояние читается из структурного JSON, а отрицательный
 * результат печатается вместе со способом проверки.
 *
 * Использование:
 *   yarn pr:wait <N> [--once] [--timeout-min 15] [--interval-sec 20]
 *
 * Exit-коды: 0 green · 1 red · 2 none · 3 таймаут при running · 4 ошибка usage/gh.
 */
import { execSync } from 'node:child_process';

const RED_CONCLUSIONS = new Set([
  'FAILURE',
  'ERROR',
  'CANCELLED',
  'TIMED_OUT',
  'ACTION_REQUIRED',
  'STARTUP_FAILURE',
  'STALE',
]);
const GREEN_CONCLUSIONS = new Set(['SUCCESS', 'SKIPPED', 'NEUTRAL']);

/**
 * Классифицировать statusCheckRollup из `gh pr view --json statusCheckRollup`.
 * Элементы двух видов: CheckRun {status, conclusion} и StatusContext {state}.
 *
 * @param {Array<object> | null | undefined} rollup
 * @returns {{state: 'none'|'running'|'green'|'red', total: number, ok: number,
 *            failing: string[], pending: string[]}}
 */
export function classifyChecks(rollup) {
  const items = Array.isArray(rollup) ? rollup : [];
  if (items.length === 0) {
    return { state: 'none', total: 0, ok: 0, failing: [], pending: [] };
  }

  const failing = [];
  const pending = [];
  let ok = 0;

  for (const item of items) {
    const name = item.name || item.context || item.workflowName || 'unnamed-check';
    // StatusContext: SUCCESS | PENDING | FAILURE | ERROR | EXPECTED
    const state = (item.state || '').toUpperCase();
    // CheckRun: status QUEUED|IN_PROGRESS|COMPLETED, conclusion при COMPLETED
    const status = (item.status || '').toUpperCase();
    const conclusion = (item.conclusion || '').toUpperCase();

    if (state) {
      if (state === 'SUCCESS') ok += 1;
      else if (state === 'PENDING' || state === 'EXPECTED') pending.push(name);
      else failing.push(`${name}: ${state}`);
      continue;
    }

    if (status && status !== 'COMPLETED') {
      pending.push(name);
      continue;
    }
    if (RED_CONCLUSIONS.has(conclusion)) {
      failing.push(`${name}: ${conclusion}`);
    } else if (GREEN_CONCLUSIONS.has(conclusion)) {
      ok += 1;
    } else {
      // Неизвестный вердикт не считаем успехом — честнее показать как pending.
      pending.push(`${name} (conclusion=${conclusion || 'нет'})`);
    }
  }

  // Красное приоритетнее running: упавший чек не станет зелёным от ожидания.
  const state = failing.length > 0 ? 'red' : pending.length > 0 ? 'running' : 'green';
  return { state, total: items.length, ok, failing, pending };
}

/**
 * Объяснение состояния none: почему проверок нет и что делать.
 * Конфликтующий PR (mergeable CONFLICTING / mergeState DIRTY) не строит
 * merge-ref → события pull_request не порождают прогонов (#643 п.2).
 *
 * @param {{mergeable?: string, mergeStateStatus?: string}} pr
 * @returns {string}
 */
export function explainNoChecks(pr) {
  const mergeable = (pr.mergeable || '').toUpperCase();
  const mergeState = (pr.mergeStateStatus || '').toUpperCase();
  if (mergeable === 'CONFLICTING' || mergeState === 'DIRTY') {
    return (
      'проверок нет, потому что PR конфликтует с базой ' +
      `(mergeable=${mergeable || '?'}, mergeStateStatus=${mergeState || '?'}) — ` +
      'GitHub не строит merge-ref и CI не запускается. Сначала разрешить конфликт, ' +
      'потом ждать проверок. Смотреть воркфлоу/paths-ignore бессмысленно.'
    );
  }
  return (
    'проверок нет (это НЕ зелено). Возможные причины: прогоны ещё не созданы ' +
    'после пуша, воркфлоу не триггерится на эту ветку/пути, или CI выключен. ' +
    `mergeable=${mergeable || '?'}, mergeStateStatus=${mergeState || '?'}.`
  );
}

function usage() {
  console.error('Usage: yarn pr:wait <N> [--once] [--timeout-min 15] [--interval-sec 20]');
}

function readPr(number) {
  const raw = execSync(
    `gh pr view ${number} --json number,url,state,mergeable,mergeStateStatus,headRefOid,statusCheckRollup`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 },
  ).trim();
  return JSON.parse(raw);
}

function report(pr, checks) {
  const sha = (pr.headRefOid || '').slice(0, 8);
  console.log(
    `[pr:wait] PR #${pr.number} (${sha}) state=${checks.state} ` +
      `checks=${checks.ok}/${checks.total} mergeable=${pr.mergeable || '?'} ` +
      `mergeState=${pr.mergeStateStatus || '?'}`,
  );
  for (const f of checks.failing) console.log(`  ✗ ${f}`);
  for (const p of checks.pending) console.log(`  … ${p}`);
}

function parseArgs(argv) {
  const args = { number: null, once: false, timeoutMin: 15, intervalSec: 20 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--once') args.once = true;
    else if (a === '--timeout-min') args.timeoutMin = Number(argv[(i += 1)]);
    else if (a === '--interval-sec') args.intervalSec = Number(argv[(i += 1)]);
    else if (/^\d+$/.test(a)) args.number = a;
    else return { error: `неизвестный аргумент: ${a}` };
  }
  if (!args.number) return { error: 'нужен номер PR' };
  if (!Number.isFinite(args.timeoutMin) || args.timeoutMin <= 0) {
    return { error: '--timeout-min должен быть положительным числом' };
  }
  if (!Number.isFinite(args.intervalSec) || args.intervalSec <= 0) {
    return { error: '--interval-sec должен быть положительным числом' };
  }
  return { args };
}

const EXIT_BY_STATE = { green: 0, red: 1, none: 2 };

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(`[pr:wait] ${parsed.error}`);
    usage();
    process.exitCode = 4;
    return;
  }
  const { number, once, timeoutMin, intervalSec } = parsed.args;
  const deadline = Date.now() + timeoutMin * 60_000;

  for (;;) {
    let pr;
    try {
      pr = readPr(number);
    } catch (e) {
      console.error(`[pr:wait] gh pr view ${number} не отработал: ${e.message.split('\n')[0]}`);
      console.error('  Проверить: gh auth status; существует ли PR.');
      process.exitCode = 4;
      return;
    }

    const checks = classifyChecks(pr.statusCheckRollup);
    report(pr, checks);

    if (checks.state === 'green' || checks.state === 'red') {
      if (checks.state === 'red') {
        console.error('[pr:wait] красный CI — ссылки на упавшие прогоны: gh pr checks ' + number);
      }
      process.exitCode = EXIT_BY_STATE[checks.state];
      return;
    }

    // none при конфликте безнадёжен — ожидание его не вылечит, выходим сразу.
    const conflict =
      (pr.mergeable || '').toUpperCase() === 'CONFLICTING' ||
      (pr.mergeStateStatus || '').toUpperCase() === 'DIRTY';
    if (checks.state === 'none' && conflict) {
      console.error(`[pr:wait] ${explainNoChecks(pr)}`);
      process.exitCode = 2;
      return;
    }

    if (once || Date.now() >= deadline) {
      if (checks.state === 'none') {
        console.error(`[pr:wait] ${explainNoChecks(pr)}`);
        console.error(`  Способ проверки: gh pr view ${number} --json statusCheckRollup,mergeable`);
        process.exitCode = 2;
      } else {
        if (!once) console.error(`[pr:wait] таймаут ${timeoutMin} мин — проверки ещё идут.`);
        process.exitCode = 3;
      }
      return;
    }

    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/pr-wait.mjs')) {
  await main();
}
