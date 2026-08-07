#!/usr/bin/env node
/**
 * pr:wait — честное ожидание проверок PR (#643 п.1, #724).
 *
 * Состояния (не схлопывать):
 *   none     — проверок нет (это НЕ зелено; при CONFLICTING CI не запустится)
 *   running  — проверки идут
 *   green    — CI успешен и review не блокирует
 *   red      — есть failure / error / cancelled / timed_out / …
 *   approval — CI не red, но PR ждёт review/approval (#724)
 *
 * Использование:
 *   yarn pr:wait [N] [--once] [--timeout-min 15] [--interval-sec 20] [--resume]
 *   Без номера — PR текущей ветки (gh pr view без аргумента).
 *
 * Exit-коды: 0 green · 1 red · 2 none · 3 таймаут running · 4 usage/gh · 5 approval.
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMergeBlocked, reconcileMergeability, resolveRepoSlug, fetchRestPullMergeFields } from './lib/pr-mergeability.mjs';
import { REVIEW_STATUS_CONTEXT } from './lib/review-gate.mjs';

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
const APPROVAL_DECISIONS = new Set(['REVIEW_REQUIRED', 'CHANGES_REQUESTED']);

/**
 * Статусы, которые ставит САМ шип-флоу, а не CI. Их нельзя ждать здесь: в цепочке
 * `pr:ship` порядок ci-wait → review-gate → merge, и гейт публикует `review/teamlead`
 * ПОСЛЕ этого ожидания. Первый заход оставляет `pending` (ревью ещё не было), и любой
 * следующий ci-wait ждёт статус, выставить который может только шаг за ним, — самоссылка.
 *
 * Живой тупик 29.07 (PR #1461): ship упал на гейте «ревью не найдено», оставив
 * `review/teamlead=pending`; после `code-review:pr` повторный `--merge-only` встал
 * навсегда — 4 проверки CI зелёные, пятая ждёт саму себя. Расклинивали руками.
 *
 * Вердикт гейта здесь не теряется: `review-gate` идёт следующим шагом и падает громко,
 * если ревью нет или BLOCK. Дело ci-wait — сборка, не ревью.
 */
export const SELF_MANAGED_CONTEXTS = new Set([REVIEW_STATUS_CONTEXT]);

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Каталог для checkpoint.
 * Нельзя писать в `repo/.git/…`: в sibling-worktree `.git` — файл, `mkdir` → EEXIST.
 * `git rev-parse --git-dir` даёт реальную директорию (primary или …/worktrees/<name>).
 */
export function resolveCheckpointDir(root = ROOT) {
  try {
    const gitDir = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-dir'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (gitDir) return gitDir;
  } catch {
    /* fallthrough */
  }
  return join(tmpdir(), 'membrana-pr-wait');
}

/**
 * Классифицировать statusCheckRollup из `gh pr view --json statusCheckRollup`.
 * @param {Array<object> | null | undefined} rollup
 * @returns {{state: 'none'|'running'|'green'|'red', total: number, ok: number,
 *            failing: string[], pending: string[]}}
 */
/**
 * Объявленные обязательные контексты — из полиси защиты ветки, а не из головы.
 *
 * ЗАЧЕМ (долг `#ci-wait-sees-unregistered-checks`, #1764). `statusCheckRollup` несёт то,
 * что GitHub УЖЕ зарегистрировал; задания появляются асинхронно после пуша. Классификация
 * по одному лишь ролапу объявляет зелёным неполное множество: замер 07.08 —
 * `checks=1/1 state=green` при четырёх фактических проверках, одна из которых `pending`.
 * За одно утро наблюдалось трижды.
 *
 * Ожидаемое множество ОБЪЯВЛЕНО машиночитаемо (#1310, магистраль 27.07), поэтому здесь
 * не изобретается список, а читается готовый. Полиси только ЧИТАЕТСЯ: правки в ней — словом
 * владельца, это правила его ветки.
 *
 * Полиси недоступна → возвращаем `null`, и это НЕ «требований нет»: вызывающий обязан
 * сказать вслух, что сверка не состоялась. Молчаливая деградация здесь равна прежнему дефекту.
 *
 * @returns {string[]|null}
 */
export function readRequiredContexts(root = ROOT) {
  try {
    const raw = readFileSync(join(root, 'docs/security/branch-protection-policy.json'), 'utf8');
    const contexts = JSON.parse(raw)?.requiredStatusChecks?.contexts;
    return Array.isArray(contexts) ? contexts.map((c) => String(c).trim()).filter(Boolean) : null;
  } catch {
    return null;
  }
}

/** Имя элемента ролапа: check-runs кладут его в `name`, statuses — в `context` (#1764, ловушка Дынина). */
const labelOf = (item) => String(item?.name || item?.context || item?.workflowName || '').trim();

/**
 * Классифицировать statusCheckRollup из `gh pr view --json statusCheckRollup`.
 *
 * СВЕРКА С ОБЪЯВЛЕННЫМ (разбор Дынина, #1764). Порядок операций несущий: вычитать
 * самоуправляемые надо из ОЖИДАЕМОГО множества, а не только из наблюдаемого, иначе
 * `review/teamlead` уйдёт из наблюдаемых, останется в требуемых — и получится вечный
 * `incomplete` вместо прежнего ложного `green`. Обмен был бы плохой.
 *
 *   expected := required \ selfManaged
 *   seen     := rollup   \ selfManaged
 *   missing  := expected \ seen
 *
 * Сравнение имён — СТРОГОЕ, с учётом регистра (решение владельца 07.08): GitHub
 * регистрозависим для имён проверок, а мягкое сравнение по префиксу зачло бы чужое задание
 * с совпавшим началом имени за обязательное. Цена строгости названа: первый матричный job
 * (`build (node-20)`) сломает гейт, пока полиси не поправят — отказ громкий, не молчаливый.
 *
 * @param {Array<object> | null | undefined} rollup
 * @param {string[]|null} [expected] объявленные обязательные контексты; `null` — сверка не состоялась
 */
export function classifyChecks(rollup, expected = null) {
  const all = Array.isArray(rollup) ? rollup : [];
  // Самоссылку отсекаем ДО подсчёта: иначе `pending`, оставленный собственным гейтом,
  // навсегда держит state=running (см. SELF_MANAGED_CONTEXTS). Отсечённые не исчезают
  // молча — возвращаем их отдельным полем, вызывающий печатает строкой.
  const selfManaged = [];
  const items = [];
  for (const item of all) {
    const label = item.name || item.context || item.workflowName || '';
    if (SELF_MANAGED_CONTEXTS.has(label)) selfManaged.push(label);
    else items.push(item);
  }
  // Ожидаемое чистим от самоуправляемых ДО сверки — см. шапку функции.
  const expectedEffective = Array.isArray(expected)
    ? expected.map((c) => String(c).trim()).filter((c) => c && !SELF_MANAGED_CONTEXTS.has(c))
    : null;
  const seen = new Set(items.map((i) => labelOf(i)).filter(Boolean));
  const missing = expectedEffective ? expectedEffective.filter((c) => !seen.has(c)) : [];
  const verified = expectedEffective !== null;

  if (items.length === 0) {
    return { state: 'none', total: 0, ok: 0, failing: [], pending: [], selfManaged, missing, verified };
  }

  const failing = [];
  const pending = [];
  let ok = 0;

  for (const item of items) {
    const name = item.name || item.context || item.workflowName || 'unnamed-check';
    const state = (item.state || '').toUpperCase();
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
      pending.push(`${name} (conclusion=${conclusion || 'нет'})`);
    }
  }

  // Порядок родов несущий: red ≻ running ≻ incomplete ≻ green.
  // `incomplete` — ОТДЕЛЬНЫЙ род, не `running` (разбор Дынина): `running` разрешается сам,
  // а незарегистрированное задание может не появиться вовсе. Смешать их — потерять
  // различие «идёт» и «неизвестно, стартовало ли».
  const state =
    failing.length > 0
      ? 'red'
      : pending.length > 0
        ? 'running'
        : missing.length > 0
          ? 'incomplete'
          : 'green';
  return { state, total: items.length, ok, failing, pending, selfManaged, missing, verified };
}

/**
 * Итоговое состояние pr:wait с учётом reviewDecision (#724).
 * approval только когда CI не red/running/none — иначе review не маскирует CI.
 *
 * @param {{rollup?: Array<object>|null, reviewDecision?: string|null}} input
 */
export function classifyPrWait({ rollup, reviewDecision, expected = null } = {}) {
  const checks = classifyChecks(rollup, expected);
  const rd = (reviewDecision || '').toUpperCase();
  if (checks.state === 'green' && APPROVAL_DECISIONS.has(rd)) {
    return { ...checks, state: 'approval', reviewDecision: rd };
  }
  return { ...checks, reviewDecision: rd || null };
}

/**
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

/** @param {string|null} number @param {string} [checkpointDir] */
export function checkpointPath(number, checkpointDir = resolveCheckpointDir()) {
  const key = number || 'branch';
  return join(checkpointDir, `pr-wait-${key}.json`);
}

/**
 * @param {{number: string|null, deadlineMs: number, timeoutMin: number, intervalSec: number}} data
 * @param {string} [checkpointDir]
 */
export function writeCheckpoint(data, checkpointDir = resolveCheckpointDir()) {
  mkdirSync(checkpointDir, { recursive: true });
  const path = checkpointPath(data.number, checkpointDir);
  writeFileSync(
    path,
    JSON.stringify({ ...data, savedAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
  return path;
}

/** @returns {{number: string|null, deadlineMs: number, timeoutMin: number, intervalSec: number}|null} */
export function readCheckpoint(number, checkpointDir = resolveCheckpointDir()) {
  const path = checkpointPath(number, checkpointDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

export function clearCheckpoint(number, checkpointDir = resolveCheckpointDir()) {
  const path = checkpointPath(number, checkpointDir);
  try {
    unlinkSync(path);
  } catch {
    /* ignore */
  }
}

function usage() {
  console.error('Usage: yarn pr:wait [N] [--once] [--timeout-min 15] [--interval-sec 20] [--resume]');
  console.error('  Без номера — PR текущей ветки.');
  console.error('  Exit: 0 green · 1 red · 2 none · 3 timeout(running) · 4 error · 5 approval');
}

function readPr(number) {
  const ref = number ? `${number} ` : '';
  const raw = execSync(
    `gh pr view ${ref}--json number,url,state,mergeable,mergeStateStatus,headRefOid,statusCheckRollup,reviewDecision`,
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 },
  ).trim();
  const pr = JSON.parse(raw);
  try {
    const repoSlug = resolveRepoSlug(execFileSync);
    const restSnap = fetchRestPullMergeFields(execFileSync, repoSlug, pr.number ?? number);
    const reconciled = reconcileMergeability(
      { mergeable: pr.mergeable, mergeStateStatus: pr.mergeStateStatus, headRefOid: pr.headRefOid },
      restSnap,
    );
    if (reconciled.mergeabilitySource === 'rest-recheck') {
      console.log(
        `[pr:wait] mergeability rest-recheck (#1028): graphql ${reconciled.graphqlStale?.mergeable}/${reconciled.graphqlStale?.mergeStateStatus} → ${reconciled.mergeable}/${reconciled.mergeStateStatus}`,
      );
    }
    pr.mergeable = reconciled.mergeable;
    pr.mergeStateStatus = reconciled.mergeStateStatus;
    if (reconciled.headRefOid) pr.headRefOid = reconciled.headRefOid;
  } catch {
    /* graphql-only fallback */
  }
  return pr;
}

function report(pr, checks) {
  const sha = (pr.headRefOid || '').slice(0, 8);
  const review = checks.reviewDecision ? ` review=${checks.reviewDecision}` : '';
  console.log(
    `[pr:wait] PR #${pr.number} (${sha}) state=${checks.state} ` +
      `checks=${checks.ok}/${checks.total} mergeable=${pr.mergeable || '?'} ` +
      `mergeState=${pr.mergeStateStatus || '?'}${review}`,
  );
  for (const f of checks.failing) console.log(`  ✗ ${f}`);
  for (const p of checks.pending) console.log(`  … ${p}`);
  // Не «пропало из счёта», а названо: ждёт следующий шаг цепочки, не сборка.
  for (const s of checks.selfManaged ?? []) {
    console.log(`  ○ ${s} — ставит шип-гейт после этого ожидания, здесь не ждём`);
  }
  // Недостающие называются поимённо: «зелёный по неполному множеству» — тот самый дефект,
  // ради которого сверка и заведена, и молчать о нём нельзя (#1764).
  for (const m of checks.missing ?? []) {
    console.log(`  ◌ ${m} — обязательный контекст ещё не зарегистрирован в ролапе`);
  }
  if (checks.verified === false) {
    console.log('  ⚠ сверка с объявленным множеством НЕ состоялась: полиси защиты не прочитана');
  }
  if (checks.state === 'approval') {
    console.log('  ⏳ CI не red, но PR ждёт review/approval — не считать зелёным merge-ready.');
  }
}

/**
 * Класс сбоя `gh`. Транзиент сети лечится ожиданием, «нет PR» и «нет auth» — нет,
 * а раньше все три лечились одинаково: жёсткие три попытки без бэкоффа.
 *
 * Эпизоды 26.07 (#1261): PR #1243 — `spawnSync … ETIMEDOUT` трижды плюс
 * `TLS handshake timeout` от GraphQL, ожидание умерло и merge НЕ выполнился;
 * PR #1253 — то же. Классифицируем по ПОЛНОМУ тексту ошибки: реальная причина у `gh`
 * лежит в stderr, то есть НЕ в первой строке (её одну и печатал лог).
 *
 * @param {string} message
 * @returns {'network'|'notfound'|'auth'|'unknown'}
 */
export function classifyGhFailure(message) {
  const m = String(message ?? '');
  if (/no pull requests found|could not resolve to a (pullrequest|repository)|not found|no such/i.test(m)) {
    return 'notfound';
  }
  if (/gh auth login|authentication|unauthorized|bad credentials|http 40[13]/i.test(m)) return 'auth';
  if (
    /etimedout|econnreset|enotfound|eai_again|econnrefused|esockettimedout|socket hang up/i.test(m) ||
    /tls handshake timeout|timeout|timed out|temporary failure|502|503|504|bad gateway|gateway time-?out/i.test(m)
  ) {
    return 'network';
  }
  return 'unknown';
}

/**
 * Бюджет ПОДРЯД идущих неудач по классу. Сеть терпим долго (всё равно ограничены
 * дедлайном), «нет PR / нет auth» — сразу, ожидание их не вылечит.
 *
 * @param {'network'|'notfound'|'auth'|'unknown'} cls
 * @returns {number}
 */
export function ghRetryBudget(cls) {
  if (cls === 'notfound' || cls === 'auth') return 1;
  if (cls === 'network') return 10;
  return 5;
}

/**
 * Пауза перед повтором: экспонента от интервала опроса, с потолком.
 * Раньше пауза равнялась интервалу — три подряд таймаута укладывались в секунды
 * и сжигали весь бюджет до того, как сеть успевала прийти в себя.
 *
 * @param {number} consecutiveFails 1-based номер неудачи
 * @param {number} intervalSec
 * @param {number} [capMs]
 * @returns {number}
 */
export function ghBackoffMs(consecutiveFails, intervalSec, capMs = 120_000) {
  const base = Math.max(1, intervalSec) * 1000;
  const grown = base * 2 ** Math.max(0, consecutiveFails - 1);
  return Math.min(grown, capMs);
}

export function parseArgs(argv) {
  const args = { number: null, once: false, timeoutMin: 15, intervalSec: 20, resume: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--once') args.once = true;
    else if (a === '--resume') args.resume = true;
    else if (a === '--timeout-min') args.timeoutMin = Number(argv[(i += 1)]);
    else if (a === '--interval-sec') args.intervalSec = Number(argv[(i += 1)]);
    else if (/^\d+$/.test(a)) args.number = a;
    else return { error: `неизвестный аргумент: ${a}` };
  }
  if (!Number.isFinite(args.timeoutMin) || args.timeoutMin <= 0) {
    return { error: '--timeout-min должен быть положительным числом' };
  }
  if (!Number.isFinite(args.intervalSec) || args.intervalSec <= 0) {
    return { error: '--interval-sec должен быть положительным числом' };
  }
  return { args };
}

const EXIT_BY_STATE = { green: 0, red: 1, none: 2, approval: 5 };

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.error) {
    console.error(`[pr:wait] ${parsed.error}`);
    usage();
    process.exitCode = 4;
    return;
  }
  let { number, once, timeoutMin, intervalSec, resume } = parsed.args;

  // Читаем объявленное множество ОДИН раз за прогон: полиси — файл репозитория, не сеть.
  const requiredContexts = readRequiredContexts();
  if (requiredContexts === null) {
    console.error('[pr:wait] ⚠ полиси защиты ветки не прочитана — сверка с объявленным множеством не состоится');
  }

  let deadline = Date.now() + timeoutMin * 60_000;
  if (resume) {
    const cp = readCheckpoint(number);
    if (cp) {
      number = number ?? cp.number;
      intervalSec = cp.intervalSec || intervalSec;
      timeoutMin = cp.timeoutMin || timeoutMin;
      deadline = typeof cp.deadlineMs === 'number' ? cp.deadlineMs : deadline;
      if (deadline <= Date.now()) {
        // Исходный дедлайн истёк — продлеваем на полный timeoutMin от resume.
        deadline = Date.now() + timeoutMin * 60_000;
        console.log(`[pr:wait] --resume: checkpoint был просрочен, новый дедлайн +${timeoutMin} мин`);
      } else {
        const leftMin = Math.max(1, Math.ceil((deadline - Date.now()) / 60_000));
        console.log(`[pr:wait] --resume: продолжаем ожидание (~${leftMin} мин до дедлайна checkpoint)`);
      }
    } else {
      console.log('[pr:wait] --resume: checkpoint не найден — стартуем заново');
    }
  }

  writeCheckpoint({ number, deadlineMs: deadline, timeoutMin, intervalSec });

  let ghFails = 0;
  let interrupted = false;
  const onSig = () => {
    interrupted = true;
    writeCheckpoint({ number, deadlineMs: deadline, timeoutMin, intervalSec });
    console.error('[pr:wait] interrupt — checkpoint сохранён; продолжить: yarn pr:wait --resume' + (number ? ` ${number}` : ''));
    process.exitCode = 3;
  };
  process.on('SIGINT', onSig);
  process.on('SIGTERM', onSig);

  try {
    for (;;) {
      if (interrupted) return;

      let pr;
      try {
        pr = readPr(number);
        ghFails = 0;
        if (!number) number = String(pr.number);
      } catch (e) {
        ghFails += 1;
        const cls = classifyGhFailure(e.message);
        const budget = ghRetryBudget(cls);
        const first = String(e.message ?? '').split('\n')[0];
        console.error(
          `[pr:wait] gh pr view ${number ?? '(PR текущей ветки)'} не отработал (${ghFails}/${budget}, класс ${cls}): ${first}`,
        );
        if (once || ghFails >= budget || Date.now() >= deadline) {
          console.error(
            cls === 'network'
              ? '  Сеть/прокси не отвечает. Мердж НЕ выполнен — состояние смотреть: gh pr view <N> --json state,mergeCommit'
              : '  Проверить: gh auth status; существует ли PR (без номера — есть ли PR у текущей ветки).',
          );
          if (cls === 'network' || cls === 'unknown') {
            // Полный текст только на выходе: в нём причина, а её первая строка не несёт.
            console.error(`  Полный текст последней ошибки:\n${e.message}`);
          }
          process.exitCode = 4;
          return;
        }
        await new Promise((r) => setTimeout(r, ghBackoffMs(ghFails, intervalSec)));
        continue;
      }

      const checks = classifyPrWait({
        rollup: pr.statusCheckRollup,
        reviewDecision: pr.reviewDecision,
        expected: requiredContexts,
      });
      report(pr, checks);
      writeCheckpoint({ number: String(pr.number), deadlineMs: deadline, timeoutMin, intervalSec });

      if (checks.state === 'green' || checks.state === 'red') {
        if (checks.state === 'red') {
          console.error('[pr:wait] красный CI — ссылки на упавшие прогоны: gh pr checks ' + (number ?? pr.number));
        }
        clearCheckpoint(String(pr.number));
        process.exitCode = EXIT_BY_STATE[checks.state];
        return;
      }

      const conflict = isMergeBlocked(pr);
      if (checks.state === 'none' && conflict) {
        console.error(`[pr:wait] ${explainNoChecks(pr)}`);
        clearCheckpoint(String(pr.number));
        process.exitCode = 2;
        return;
      }

      if (once || Date.now() >= deadline) {
        if (checks.state === 'none') {
          console.error(`[pr:wait] ${explainNoChecks(pr)}`);
          console.error(`  Способ проверки: gh pr view ${number ?? pr.number} --json statusCheckRollup,mergeable,reviewDecision`);
          process.exitCode = 2;
        } else if (checks.state === 'approval') {
          console.error('[pr:wait] CI ок, но нужен review/approval (exit 5). Повтор: yarn pr:wait --resume ' + (number ?? pr.number));
          process.exitCode = 5;
        } else if (checks.state === 'incomplete') {
          // Решение владельца 07.08: ждём, а по истечении срока — КРАСНЫЙ, не «таймаут».
          // «Не появилось» ≠ «идёт»: молчаливый пропуск здесь и есть чинимый дефект.
          console.error(
            `[pr:wait] обязательные проверки так и не зарегистрированы за ${timeoutMin} мин: ` +
              `${checks.missing.join(', ')} — мержить нельзя`,
          );
          process.exitCode = 1;
        } else {
          if (!once) console.error(`[pr:wait] таймаут ${timeoutMin} мин — проверки ещё идут.`);
          process.exitCode = 3;
        }
        return;
      }

      // approval при поллинге: ждём approve, как running — не выходим до once/deadline.
      await new Promise((r) => setTimeout(r, intervalSec * 1000));
    }
  } finally {
    process.off('SIGINT', onSig);
    process.off('SIGTERM', onSig);
  }
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('/pr-wait.mjs')) {
  await main();
}
