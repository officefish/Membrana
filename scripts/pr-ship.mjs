#!/usr/bin/env node
/**
 * yarn pr:ship — one-shot PR-флоу: [ветка] → commit → push → PR (Closes #N) →
 * squash-merge → ff-sync main. По итогам сессии 2026-07-08 (~26 ручных прогонов).
 *
 * БЕЗОПАСНОСТЬ: по умолчанию `--dry-run` (печатает команды, ничего не делает).
 * `--execute` — реально выполнить. Гуарды: не коммитить на base-ветке без `--branch`.
 *
 * Usage:
 *   yarn pr:ship --type feat --scope core --message "..." [--issue 123] [--branch feat/x]
 *   yarn pr:ship ... --execute            # реально выполнить
 *   yarn pr:ship ... --no-merge           # только PR, без squash-merge
 *   yarn pr:ship ... --no-commit          # коммиты уже готовы: push → PR → merge (без commit/branch)
 *
 * `--branch`: идемпотентен — если уже на этой ветке, шаг пропускается; если ветка
 * есть локально — `checkout`, иначе `checkout -b` (фикс 19.07: already exists).
 *   yarn pr:ship ... --no-wait            # НЕ ждать зелёного CI перед merge (осознанный обход)
 *   yarn pr:ship ... --auto               # серверное автослияние: GitHub сольёт по зелёному
 *
 * `--auto` (#1261) — против гонки с base на плотном трафике: локальный ci-wait длится
 * минуты, за это время общая ветка уезжает и PR становится CONFLICTING уже ПОСЛЕ зелёного
 * (26.07: три PR подряд). Сервер такую гонку не проигрывает. Цена: факт мерджа
 * подтверждается не в этом прогоне — смотреть состоянием (`gh pr view N --json state`).
 *
 * Merge (#653): перед merge — ci-wait (scripts/pr-wait.mjs, четыре состояния CI);
 * merge БЕЗ --delete-branch (чекаут base падает, когда base держит соседний worktree);
 * remote-ветка удаляется отдельным шагом branch-cleanup, локальная остаётся.
 *
 * ATF4-1 (#969): перед merge — STOP при CONFLICTING/DIRTY (не звать gh pr merge).
 * ATF4-3 (#971): pr-create через --body-file (длинный путь под scripts/cache/).
 *
 * Логика планирования (planPrShip) — чистая и покрыта тестом; CLI лишь исполняет/печатает.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyWorktree, parseWorktreeCard } from './lib/classify-worktree.mjs';
import { makeLongTempDir } from './lib/long-temp-path.mjs';
import { EXTERNAL_CALL_TIMEOUT_MS, alreadyInBase } from './lib/merge-fact.mjs';
import { isMergeBlocked, readMergeabilityWithRestRecheck } from './lib/pr-mergeability.mjs';
import {
  assertPrMergeableOrRegistryLand,
  prTouchesRegistry,
  readPrChangedPaths,
} from './lib/task-pr-land.mjs';

const TRAILER = 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Гейт mergeable перед `gh pr merge` (ATF4-1 / #969).
 *
 * @param {{mergeable?: string|null, mergeStateStatus?: string|null, branch?: string}} snap
 * @returns {void}
 */
export function assertPrMergeableForShip(snap = {}) {
  assertPrMergeableOrRegistryLand(snap);
}

/**
 * Снимок mergeable текущего PR (или пустой объект, если gh недоступен).
 * @param {{run?: typeof execFileSync, branch?: string}} [opts]
 */
export function readPrMergeability(opts = {}) {
  const run = opts.run ?? execFileSync;
  try {
    const snap = readMergeabilityWithRestRecheck(run, opts.prNumber ?? null);
    return {
      number: snap.number ?? null,
      mergeable: snap.mergeable ?? null,
      mergeStateStatus: snap.mergeStateStatus ?? null,
      branch: snap.branch ?? opts.branch ?? null,
      mergeabilitySource: snap.mergeabilitySource ?? null,
    };
  } catch {
    return { mergeable: null, mergeStateStatus: null, branch: opts.branch ?? null };
  }
}

/**
 * Решение по `--auto` при известной возможности репозитория.
 *
 * Живой случай 26.07: первый же прогон `--auto` дал
 * `GraphQL: Auto merge is not allowed for this repository (enablePullRequestAutoMerge)` —
 * и оставил PR #1269 открытым без мерджа. Флаг верен, но включение автослияния — настройка
 * репозитория (`allow_auto_merge`), то есть решение владельца. Поэтому возможность
 * опрашивается ДО планирования, а при запрете — честный откат на обычный хвост, а не
 * повисший PR.
 *
 * @param {{requested?: boolean, allowed?: boolean|null}} opts
 * @returns {{mode: 'auto'|'wait', note: string|null}}
 */
export function autoMergeDecision(opts = {}) {
  const requested = opts.requested === true;
  if (!requested) return { mode: 'wait', note: null };
  if (opts.allowed === true) {
    // ВТОРОЕ условие, найденное на живых прогонах 26.07: без обязательных проверок в
    // защите ветки серверу нечего ждать, и `--auto` мержит НЕМЕДЛЕННО — то есть мимо CI.
    // PR #1276 и #1278 так и слились за секунды. Это ломает инвариант #653 «merge только
    // после зелёного», поэтому при незащищённой базе флаг обязан отказаться сам.
    const checks = opts.requiredChecks;
    if (Array.isArray(checks) && checks.length > 0) return { mode: 'auto', note: null };
    return {
      mode: 'wait',
      note:
        'автослияние разрешено, но у base НЕТ обязательных проверок (ветка не защищена) — ' +
        'тогда сервер сливает СРАЗУ, минуя CI. Иду обычным хвостом с ожиданием. ' +
        'Чтобы --auto означал «по зелёному», нужна защита ветки с required status checks.',
    };
  }
  if (opts.allowed === false) {
    return {
      mode: 'wait',
      note: '--auto запрошен, но в настройках репозитория автослияние выключено (allow_auto_merge=false) — иду обычным хвостом с ожиданием CI. Включить: Settings → General → Allow auto-merge.',
    };
  }
  return {
    mode: 'wait',
    note: '--auto запрошен, но возможность автослияния не удалось выяснить (gh недоступен) — иду обычным хвостом.',
  };
}

/**
 * `--merge-only` мержит то, что лежит в origin. Если локально есть неотправленные коммиты,
 * мердж возьмёт ДРУГОЕ содержание — молча.
 *
 * Находка соседней сессии 26.07: режим звал слияние, не отправив коммиты, и приходил отказ
 * «ветка разошлась с локальной». Норма #700 держит merge-only без push намеренно (он не
 * должен трогать remote помимо мерджа), поэтому чиним не push'ем, а громким отказом.
 *
 * @param {{ local?: string|null, remote?: string|null, branch?: string }} refs
 * @returns {string|null} текст отказа или null, если синхронно/выяснить нельзя
 */
export function headSyncProblem(refs = {}) {
  const { local, remote } = refs;
  if (!local || !remote) return null;
  if (local === remote) return null;
  return [
    `pr:ship --merge-only: локальный HEAD (${local.slice(0, 8)}) не совпадает с origin (${remote.slice(0, 8)}).`,
    'Мердж взял бы содержание из origin, то есть НЕ то, что у вас на ветке.',
    `Отправьте свои коммиты и повторите: git push`,
  ].join('\n');
}

/**
 * Гард незавершённого слияния (#1321, ship-merge-state-guard).
 *
 * Вещдок 26.07 (PR #1275): pre-commit отклонил merge-коммит, слияние осталось висеть
 * (MERGE_HEAD жив), а следующий шаг цепочки напечатал «Everything up-to-date» — отказ
 * дошёл до агента ВИДОМ УСПЕХА, диагноз ушёл в сторону сервера (зверь B6 «Молчаливый
 * зелёный», docs/bestiary/BESTIARY.md). Push при живом MERGE_HEAD отправляет СТАРЫЙ
 * HEAD; посадка мержит не то, что на столе. Поэтому стоп с текстом ремонта ДО push/merge.
 *
 * @param {{ mergeHeadPath?: string|null }} state
 * @returns {string|null} текст отказа или null (слияние не висит / выяснить нельзя)
 */
export function unfinishedMergeProblem(state = {}) {
  if (!state.mergeHeadPath) return null;
  return [
    `pr:ship: слияние НЕ завершено — MERGE_HEAD жив (${state.mergeHeadPath}).`,
    'Заверши: git commit (после разрешения конфликтов) ЛИБО отмени: git merge --abort.',
    'Иначе push отправит СТАРЫЙ HEAD и напечатает «Everything up-to-date» — отказ видом успеха',
    '(вещдок 26.07 / PR #1275, зверь B6 «Молчаливый зелёный»).',
  ].join('\n');
}

/**
 * Путь живого MERGE_HEAD или null. У worktree MERGE_HEAD лежит в git-dir ДЕРЕВА
 * (`.git/worktrees/<имя>/MERGE_HEAD`), не в общем `.git` — путь спрашиваем у
 * `git rev-parse --git-path` (worktree-aware), руками не строим.
 */
export function liveMergeHeadPath(run = execFileSync) {
  try {
    const p = String(
      run('git', ['rev-parse', '--path-format=absolute', '--git-path', 'MERGE_HEAD'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }),
    ).trim();
    return p && existsSync(p) ? p : null;
  } catch {
    return null; // git недоступен — гард молчит, дальше упадёт сам git громче
  }
}

/** Локальный и удалённый SHA текущей ветки. `null`, если upstream не настроен. */
export function readHeadRefs(run = execFileSync) {
  const read = (args) => {
    try {
      return String(run('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })).trim() || null;
    } catch {
      return null;
    }
  };
  return { local: read(['rev-parse', 'HEAD']), remote: read(['rev-parse', '@{u}']) };
}

/**
 * Обязательные проверки base-ветки. `[]` — ветка не защищена (или проверок нет),
 * `null` — выяснить не удалось.
 */
export function readRequiredChecks(base = 'main', run = execFileSync) {
  try {
    const raw = String(
      run('gh', ['api', `repos/{owner}/{repo}/branches/${base}/protection`, '--jq', '[.required_status_checks.contexts // []] | flatten | join(",")'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: EXTERNAL_CALL_TIMEOUT_MS,
      }),
    ).trim();
    return raw ? raw.split(',').filter(Boolean) : [];
  } catch {
    // 404 «Branch not protected» приходит ошибкой — это НЕ «не смогли выяснить»,
    // это «проверок нет». Различать важно: во втором случае --auto молча мержит мимо CI.
    return [];
  }
}

/** Разрешено ли автослияние в репозитории. `null`, если выяснить не удалось. */
export function readAutoMergeAllowed(run = execFileSync) {
  try {
    const raw = String(run('gh', ['api', 'repos/{owner}/{repo}', '--jq', '.allow_auto_merge'], { encoding: 'utf8', timeout: EXTERNAL_CALL_TIMEOUT_MS })).trim();
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

/**
 * Занята ли base-ветка ДРУГИМ worktree.
 *
 * `git checkout main` из worktree, где main держит соседнее дерево, падает —
 * одна ветка не может быть в двух worktree. Параллельные сессии у нас норма
 * (канон membrana-worktree), поэтому ff-sync там надо не чинить, а пропускать:
 * своё дерево на base не переключить, и это не ошибка.
 *
 * @param {string} base
 * @param {string[]} worktreeBranches — ветки всех worktree, КРОМЕ текущего
 */
export function isBaseHeldElsewhere(base, worktreeBranches = []) {
  return worktreeBranches.includes(base);
}

/** Ветки чужих worktree (текущий исключён). Пусто, если git недоступен. */
export function otherWorktreeBranches(run = execFileSync) {
  try {
    const porcelain = String(run('git', ['worktree', 'list', '--porcelain'], { encoding: 'utf8' }));
    const current = String(run('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' })).trim();
    const out = [];
    let path = null;
    for (const line of porcelain.split('\n')) {
      if (line.startsWith('worktree ')) path = line.slice('worktree '.length).trim();
      else if (line.startsWith('branch ')) {
        const branch = line.replace('branch refs/heads/', '').trim();
        const samePath = path && path.replace(/\\/g, '/').toLowerCase() === current.replace(/\\/g, '/').toLowerCase();
        if (!samePath) out.push(branch);
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Упоминания `#N` в тексте.
 *
 * `(#415)` в заголовке — ССЫЛКА, а не closing keyword: GitHub закрывает issue
 * только по Closes/Fixes/Resolves. Живой случай — PR #417 (13.07): заголовок
 * «…метка модальностей (#415…)», тело = копия заголовка, код слит, #415 остался
 * open. Утренний ритуал читает open как «работа не сделана» и 16.07 назначил
 * магистралью переписать уже существующее ядро `fuseDetectorConfidences`
 * (разбор: docs/seanses/main-day-issue-drift-report-2026-07-16.md).
 */
export function extractIssueMentions(text) {
  return [...String(text ?? '').matchAll(/#(\d+)/gu)].map((m) => Number(m[1]));
}

/**
 * Шаг переключения на `--branch`: идемпотентен, если уже на ней;
 * существующая локальная ветка — `checkout`, новая — `checkout -b`.
 * Живой случай 19.07: `pr:ship --branch feat/…` на уже выбранной ветке → fatal
 * «a branch named … already exists».
 *
 * @param {string|undefined} branch
 * @param {{currentBranch?: string, localBranches?: string[]}} ctx
 * @returns {{label:string,cmd:string,args:string[]}|null}
 */
export function planBranchStep(branch, ctx = {}) {
  if (!branch) return null;
  const current = ctx.currentBranch ?? '';
  if (current && current === branch) return null;
  const local = ctx.localBranches ?? [];
  if (local.includes(branch)) {
    return { label: 'branch', cmd: 'git', args: ['checkout', branch] };
  }
  return { label: 'branch', cmd: 'git', args: ['checkout', '-b', branch] };
}

/** Локальные имена веток (без remote). Пусто, если git недоступен. */
export function listLocalBranches(run = execFileSync) {
  try {
    const out = String(run('git', ['branch', '--format=%(refname:short)'], { encoding: 'utf8' }));
    return out.split(/\r?\n/u).map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Хвост мерджа — общий для полного флоу и `--merge-only`: ci-wait → merge → cleanup →
 * worktree-aware sync. Вынесен, чтобы обе точки входа несли РОВНО один безопасный
 * порядок (#653): merge БЕЗ `--delete-branch`, remote-ветка отдельным optional-шагом.
 *
 * @param {{base?:string,wait?:boolean,branch?:string,currentBranch?:string,worktreeBranches?:string[]}} opts
 * @returns {{steps:{label:string,cmd:string,args:string[],optional?:boolean}[],skippedSync?:string}}
 */
export function planMergeTail(opts = {}) {
  const { base = 'main', wait = true, branch, currentBranch, worktreeBranches, auto = false } = opts;
  /** @type {{label:string,cmd:string,args:string[],optional?:boolean,guard?:string}[]} */
  const steps = [];
  let skippedSync;
  // --auto (#1261): серверное автослияние. Локальное ожидание проигрывает гонку с base на
  // плотном трафике — CI идёт минуты, за это время общая ветка уезжает и PR становится
  // CONFLICTING уже ПОСЛЕ зелёного (26.07: PR #1248, #1253, #1256 подряд). GitHub сольёт
  // сам, как только проверки позеленеют, поэтому ci-wait/verify локально не нужны:
  // подтверждение факта мерджа переносится на следующий заход (норма — смотреть состояние).
  if (auto) {
    steps.push({ label: 'merge-auto', cmd: 'gh', args: ['pr', 'merge', '--squash', '--auto'] });
    return { steps, skippedSync: 'хвост после merge пропущен: слияние делает сервер по зелёному (--auto)' };
  }
  // #653 п.2: merge только после зелёного CI — pr-wait (#643) на PR текущей ветки
  // различает none/running/green/red; red и none-при-конфликте роняют флоу ДО merge.
  // --no-wait — осознанный обход (например, docs-only при выключенном CI).
  if (wait) steps.push({ label: 'ci-wait', cmd: 'node', args: ['scripts/pr-wait.mjs'] });
  // #653 п.1: БЕЗ --delete-branch. Он чекаутит base локально, а base почти всегда
  // держит соседний worktree (8+ деревьев) → прогон «падает» после УЖЕ УСПЕШНОГО
  // merge (ложный красный, #700). Remote-ветка удаляется отдельным шагом; локальная
  // остаётся (мы на ней стоим — её удаление и невозможно, и не нужно).
  steps.push({ label: 'merge', cmd: 'gh', args: ['pr', 'merge', '--squash'] });
  // #1166 fail-loud: сразу после merge — ассерт по СОСТОЯНИЮ (state=MERGED ∧ mergeCommit),
  // не по exit-коду шага. Стоим ещё на head-ветке (до branch-cleanup/sync-checkout), поэтому
  // `pr:verify` без номера читает PR текущей ветки. Не optional: не подтвердилось → ship падает.
  steps.push({ label: 'verify', cmd: 'node', args: ['scripts/pr-verify.mjs'] });
  const headBranch = branch ?? currentBranch;
  if (headBranch && headBranch !== base) {
    // optional: неудача удаления remote-ветки (уже удалена / protected) НЕ должна
    // «уронить» уже успешный merge — тот же класс ложного падения, что и #653 п.1.
    steps.push({ label: 'branch-cleanup', cmd: 'git', args: ['push', 'origin', '--delete', headBranch], optional: true });
  }
  if (isBaseHeldElsewhere(base, worktreeBranches)) {
    // Ветку base держит соседний worktree — checkout сюда невозможен, и это норма
    // при параллельных сессиях (канон membrana-worktree). Обновляем только
    // origin/<base>, чтобы локальные сверки видели свежий main; своё дерево не трогаем.
    steps.push({ label: 'sync-fetch', cmd: 'git', args: ['fetch', 'origin', base] });
    skippedSync = `ff-sync пропущен: ветку ${base} держит другой worktree (параллельная сессия)`;
  } else {
    // guard:'base-free' — предикат ПЕРЕПРОВЕРЯЕТСЯ перед исполнением шага, а не только
    // здесь. План строится один раз, а между планом и хвостом стоит ci-wait на минуты:
    // 26.07 (#1261) соседняя сессия заняла main ЗА ЭТО ВРЕМЯ, и уже успешный ship
    // (PR #1256 смёржен, ветка снесена) свалился ложным красным на checkout.
    steps.push({ label: 'sync-checkout', cmd: 'git', args: ['checkout', base], guard: 'base-free' });
    steps.push({ label: 'sync-fetch', cmd: 'git', args: ['fetch', 'origin', base] });
    steps.push({ label: 'sync-ff', cmd: 'git', args: ['merge', '--ff-only', `origin/${base}`], guard: 'base-free' });
  }
  return { steps, skippedSync };
}

/**
 * @param {{type?:string,scope?:string,message?:string,issue?:number|string,branch?:string,base?:string,merge?:boolean,commit?:boolean,wait?:boolean,mergeOnly?:boolean,currentBranch?:string,localBranches?:string[],worktreeBranches?:string[],allowMentionWithoutClose?:boolean}} opts
 * @returns {{title:string,commitBody:string,steps:{label:string,cmd:string,args:string[]}[],skippedSync?:string}}
 */
export function planPrShip(opts) {
  const { type, scope, message, issue, branch, base = 'main', merge = true, commit = true, wait = true, mergeOnly = false, auto = false } = opts;

  // --merge-only (#700): PR уже открыт — мёржим его безопасным хвостом, без
  // branch/commit/push/pr-create. Закрывает дыру: без этого режима «смёржить уже
  // открытый PR» тянуло к raw `gh pr merge --delete-branch` (ложный красный из worktree).
  // type/message тут не нужны (нет ни коммита, ни заголовка PR).
  if (mergeOnly) {
    if (branch) throw new Error('pr:ship: --merge-only несовместим с --branch (PR уже открыт на текущей ветке)');
    if (!merge) throw new Error('pr:ship: --merge-only и --no-merge взаимоисключают друг друга');
    const { steps, skippedSync } = planMergeTail({ base, wait, branch, currentBranch: opts.currentBranch, worktreeBranches: opts.worktreeBranches, auto });
    return { title: '', commitBody: '', steps, skippedSync };
  }

  if (!type || !message) throw new Error('pr:ship: --type и --message обязательны');
  // --no-commit (ретроспектива 2026-07-09): коммиты уже готовы на ветке —
  // шаги branch/commit пропускаются, флоу начинается с push. Ветку с готовыми
  // коммитами создавать через pr:ship бессмысленно → branch и no-commit несовместимы.
  if (!commit && branch) {
    throw new Error('pr:ship: --no-commit несовместим с --branch (коммиты уже на существующей ветке)');
  }
  const title = `${type}${scope ? `(${scope})` : ''}: ${message}`;
  // Гейт корня 1: упомянул issue в заголовке — либо закрывай (--issue), либо
  // скажи явно, что не закрываешь (--allow-mention). Молчаливое «(#N)» уже
  // стоило дня планирования 16.07.
  const mentioned = extractIssueMentions(title);
  if (!issue && mentioned.length > 0 && opts.allowMentionWithoutClose !== true) {
    throw new Error(
      `pr:ship: заголовок упоминает #${mentioned.join(', #')}, но --issue не задан — ` +
        '«(#N)» НЕ закрывает issue (нужен Closes). Добавь --issue N либо --allow-mention, ' +
        'если ссылка намеренная.',
    );
  }
  const closes = issue ? `Closes #${issue}\n` : '';
  const commitBody = `${title}\n\n${closes}${TRAILER}`;

  /** @type {{label:string,cmd:string,args:string[]}[]} */
  const steps = [];
  const branchStep = planBranchStep(branch, {
    currentBranch: opts.currentBranch,
    localBranches: opts.localBranches,
  });
  if (branchStep) steps.push(branchStep);
  if (commit) steps.push({ label: 'commit', cmd: 'git', args: ['commit', '-m', commitBody] });
  steps.push({ label: 'push', cmd: 'git', args: ['push', '-u', 'origin', 'HEAD'] });
  // ATF4-3: тело PR — bodyText; исполнитель пишет tempfile + --body-file
  steps.push({
    label: 'pr-create',
    cmd: 'gh',
    args: ['pr', 'create', '--base', base, '--title', title, '--body-file', '__BODY_FILE__'],
    bodyText: closes ? closes.trim() : title,
  });
  let skippedSync;
  if (merge) {
    const tail = planMergeTail({ base, wait, branch, currentBranch: opts.currentBranch, worktreeBranches: opts.worktreeBranches, auto });
    steps.push(...tail.steps);
    skippedSync = tail.skippedSync;
  }
  return { title, commitBody, steps, skippedSync };
}

function parseArgs(argv) {
  const o = { base: 'main', merge: true, execute: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => argv[(i += 1)];
    if (a === '--type') o.type = next();
    else if (a === '--scope') o.scope = next();
    else if (a === '--message' || a === '-m') o.message = next();
    else if (a === '--issue') o.issue = next();
    else if (a === '--branch') o.branch = next();
    else if (a === '--base') o.base = next();
    else if (a === '--no-merge') o.merge = false;
    else if (a === '--no-commit') o.commit = false;
    else if (a === '--no-wait') o.wait = false;
    else if (a === '--merge-only') o.mergeOnly = true;
    else if (a === '--auto') o.auto = true;
    else if (a === '--allow-mention') o.allowMentionWithoutClose = true;
    else if (a === '--execute') o.execute = true;
  }
  return o;
}

/**
 * #1166: как трактовать exit-код pr:wait (0 green · 1 red · 2 none · 3 timeout-running · 4 error · 5 approval).
 * transient (2 none / 3 timeout-running) — CI ещё не готов, а не провал: повторяем с --resume.
 * @param {number} code
 * @returns {'green'|'transient'|'fatal'}
 */
export function ciWaitDisposition(code) {
  if (code === 0) return 'green';
  if (code === 2 || code === 3) return 'transient';
  return 'fatal'; // 1 red · 4 error · 5 approval
}

const MAX_CI_WAIT_RESUMES = 3;

/**
 * Прогон шага ci-wait с повтором на транзиентных кодах (#1166). Первый заход — как есть,
 * повторы — с `--resume` (pr:wait продолжает с чекпойнта). Красный/approval/error и
 * исчерпание повторов — пробрасываем (ship падает честно, как и должен).
 * @param {string} cmd @param {string[]} baseArgs
 */
function runCiWaitWithResume(cmd, baseArgs) {
  for (let attempt = 0; attempt <= MAX_CI_WAIT_RESUMES; attempt += 1) {
    const args = attempt === 0 ? baseArgs : [...baseArgs, '--resume'];
    try {
      execFileSync(cmd, args, { stdio: 'inherit' });
      return; // green
    } catch (e) {
      const disp = ciWaitDisposition(typeof e.status === 'number' ? e.status : 4);
      if (disp === 'transient' && attempt < MAX_CI_WAIT_RESUMES) {
        console.error(`  ⚠ ci-wait транзиент (код ${e.status}: ${e.status === 2 ? 'проверки не созданы' : 'CI ещё идёт'}) — повтор ${attempt + 1}/${MAX_CI_WAIT_RESUMES}, --resume`);
        continue;
      }
      throw e;
    }
  }
}

function main() {
  const opts = parseArgs(process.argv);
  // Ветки соседних worktree решают, возможен ли ff-sync (см. isBaseHeldElsewhere).
  // Гуард: без --branch коммит идёт в текущую ветку; запрет коммитить прямо в base.
  const current = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();

  // #1321: незавершённое слияние — стоп ДО любых шагов (отправка И посадка).
  // Push при живом MERGE_HEAD уходит «Everything up-to-date» — отказ видом успеха (B6).
  if (opts.execute) {
    const hanging = unfinishedMergeProblem({ mergeHeadPath: liveMergeHeadPath() });
    if (hanging) {
      console.error(hanging);
      process.exitCode = 1;
      return;
    }
  }

  // Возможность автослияния — свойство репозитория, а не флага: спрашиваем ДО плана,
  // иначе `gh pr merge --auto` падает и оставляет PR открытым (26.07, PR #1269).
  if (opts.mergeOnly && opts.execute) {
    // #1320: гард повторного хвоста. PR уже приземлён? Решает git (fetch + коммит в
    // origin/<base>), НЕ gh: 27.07 два фоновых хвоста одного PR погнались друг за
    // другом, проигравший переключил дерево под живой сессией. Уже в main → честный
    // no-op, а не вторая гонка. gh здесь только даёт номер; без него — обычный путь.
    let prNum = null;
    try {
      prNum = JSON.parse(
        execFileSync('gh', ['pr', 'view', '--json', 'number'], { encoding: 'utf8', timeout: EXTERNAL_CALL_TIMEOUT_MS }),
      ).number ?? null;
    } catch {
      /* gh вспомогательный — гард молча уступает обычному пути */
    }
    const landed = alreadyInBase(prNum, opts.base ?? 'main');
    if (landed) {
      console.log(
        `pr:ship --merge-only: PR #${prNum} уже в origin/${opts.base ?? 'main'} как ${landed.slice(0, 8)} — no-op, второй хвост не нужен (#1320)`,
      );
      return;
    }
    const problem = headSyncProblem(readHeadRefs());
    if (problem) {
      console.error(problem);
      process.exitCode = 1;
      return;
    }
  }

  if (opts.auto) {
    const decision = autoMergeDecision({
      requested: true,
      allowed: readAutoMergeAllowed(),
      requiredChecks: readRequiredChecks(opts.base ?? 'main'),
    });
    if (decision.mode === 'wait') {
      console.log(`  ⚠ ${decision.note}`);
      opts.auto = false;
    }
  }

  const { title, steps, skippedSync } = planPrShip({
    ...opts,
    currentBranch: current,
    localBranches: listLocalBranches(),
    worktreeBranches: otherWorktreeBranches(),
  });

  // Гуард коммита в base — только для флоу, что коммитит. В --merge-only коммита нет,
  // но мёржить, стоя на base, всё равно нечего (у base нет своего PR) → отказ.
  if (current === opts.base && (opts.mergeOnly || !opts.branch)) {
    const why = opts.mergeOnly ? 'у base нет своего PR' : 'не коммитим прямо в base';
    throw new Error(`pr:ship: на ветке "${opts.base}" — отказ (${why}).`);
  }

  const head = opts.mergeOnly ? `merge-only PR ветки ${current}` : title;
  console.log(`pr:ship${opts.execute ? '' : ' [DRY-RUN]'}: ${head}`);
  if (skippedSync) console.log(`  ⚠ ${skippedSync}`);

  // ATF4-1: до любого merge-шага — CONFLICTING/DIRTY = STOP (#1026: hint task:pr-land для registry)
  if (opts.execute && opts.merge) {
    const run = (cmd, a) => execFileSync(cmd, a, { encoding: 'utf8' });
    const snap = readPrMergeability({ branch: current, run });
    if (isMergeBlocked(snap)) {
      let touchesRegistry = false;
      let prNumber = snap.number ?? null;
      try {
        if (prNumber == null) {
          const raw = run('gh', ['pr', 'view', '--json', 'number,files']);
          const parsed = JSON.parse(raw);
          prNumber = parsed.number ?? null;
          touchesRegistry = prTouchesRegistry((parsed.files ?? []).map((f) => String(f.path ?? f)));
        } else {
          touchesRegistry = prTouchesRegistry(readPrChangedPaths(run, prNumber));
        }
      } catch {
        /* gh недоступен — hint без registry */
      }
      assertPrMergeableForShip({ ...snap, touchesRegistry, prNumber });
    }
  }

  /** @type {string|null} */
  let bodyDir = null;
  for (const s of steps) {
    let args = s.args;
    if (s.bodyText != null) {
      if (opts.execute) {
        bodyDir = makeLongTempDir(REPO_ROOT, 'pr-ship-');
        const bodyFile = join(bodyDir, 'body.md');
        writeFileSync(bodyFile, s.bodyText, 'utf8');
        args = s.args.map((a) => (a === '__BODY_FILE__' ? bodyFile : a));
      } else {
        args = s.args.map((a) => (a === '__BODY_FILE__' ? '<long-temp/body.md>' : a));
      }
    }
    const printable = `${s.cmd} ${args.map((a) => (a.includes('\n') || a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`;
    if (!opts.execute) {
      console.log(`  · ${s.label}: ${printable.slice(0, 200)}`);
      continue;
    }
    // Гард времени исполнения: между планом и этим шагом прошли минуты ci-wait, и base
    // мог уйти к соседнему дереву. Плановый расчёт остаётся (он даёт честный dry-run),
    // но решение принимается по состоянию СЕЙЧАС — иначе ложный красный после мерджа.
    if (s.guard === 'base-free' && isBaseHeldElsewhere(opts.base ?? 'main', otherWorktreeBranches())) {
      console.log(
        `  ⤼ ${s.label} пропущен: ветку ${opts.base ?? 'main'} занял другой worktree, пока шёл CI (параллельная сессия — норма)`,
      );
      continue;
    }
    console.log(`  → ${s.label}`);
    // #1166: ci-wait транзиентен — pr:wait возвращает 2 (проверки не созданы после push) или
    // 3 (таймаут, но CI ещё ИДЁТ). Это НЕ провал — повторяем с --resume, а не роняем ship целиком.
    if (s.label === 'ci-wait') {
      runCiWaitWithResume(s.cmd, args);
      continue;
    }
    try {
      execFileSync(s.cmd, args, { stdio: 'inherit' });
    } catch (e) {
      if (!s.optional) throw e;
      console.error(`  ⚠ ${s.label} не удался (${String(e.message ?? e).split('\n')[0]}) — шаг необязательный, флоу продолжается`);
    }
  }
  if (bodyDir) {
    try {
      rmSync(bodyDir, { recursive: true, force: true });
    } catch {
      /* cache cleanup best-effort */
    }
  }
  if (!opts.execute) console.log('\n(dry-run — ничего не выполнено; добавь --execute)');
  if (opts.execute && opts.merge) reportWorktreeFate(current);
}

/**
 * Merge-гейт как потребитель classifyWorktree (K2, #717): после успешного мерджа
 * дерево спринта обычно становится sprint-closed — сказать об этом сразу, а не
 * ждать, пока хвост найдёт утренний repo:clean. Только подсказка, никаких мутаций.
 */
function reportWorktreeFate(branch) {
  let card = null;
  try {
    card = parseWorktreeCard(readFileSync(resolve(process.cwd(), 'WORKTREE.md'), 'utf8'));
  } catch {
    /* нет карточки — classify сам скажет unregistered */
  }
  let pr = null;
  let ghUnavailable = false;
  try {
    const raw = execFileSync('gh', ['pr', 'view', '--json', 'number,state'], { encoding: 'utf8', timeout: EXTERNAL_CALL_TIMEOUT_MS });
    const parsed = JSON.parse(raw);
    pr = { number: parsed.number, state: String(parsed.state).toUpperCase() };
  } catch {
    ghUnavailable = true;
  }
  let dirtyCount = 0;
  try {
    dirtyCount = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' })
      .split(/\r?\n/u)
      .filter(Boolean).length;
  } catch {
    /* без git подсказка не нужна */
  }
  const c = classifyWorktree({
    path: process.cwd(),
    branch,
    card,
    dirtyCount,
    unpushedCount: 0, // merge только что прошёл — локальное состояние уехало в PR
    pr,
    ghUnavailable,
  });
  if (c.class === 'sprint-closed') {
    console.log(`\n♻ дерево стало sprint-closed (${c.reasons[0]}) — снести: yarn repo:clean --execute --worktrees (руками)`);
  } else if (c.class === 'unregistered') {
    console.log('\n⚠ дерево без карточки WORKTREE.md (unregistered) — заведи: yarn worktree:bootstrap');
  }
}

// ESM-эквивалент require.main === module
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('pr-ship.mjs')) {
  try {
    main();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
}
