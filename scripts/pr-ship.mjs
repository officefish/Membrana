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
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyWorktree, parseWorktreeCard } from './lib/classify-worktree.mjs';
import { makeLongTempDir } from './lib/long-temp-path.mjs';

const TRAILER = 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Гейт mergeable перед `gh pr merge` (ATF4-1 / #969).
 *
 * @param {{mergeable?: string|null, mergeStateStatus?: string|null, branch?: string}} snap
 * @returns {void}
 */
export function assertPrMergeableForShip(snap = {}) {
  const mergeable = String(snap.mergeable ?? '').toUpperCase();
  const state = String(snap.mergeStateStatus ?? '').toUpperCase();
  if (mergeable === 'CONFLICTING' || state === 'DIRTY') {
    const branch = snap.branch ? ` (${snap.branch})` : '';
    throw new Error(
      `pr:ship: PR не mergeable (${mergeable || '?'} / ${state || '?'}). STOP до merge${branch}.\n` +
        '  git fetch origin && git rebase origin/main\n' +
        '  # resolve → yarn git:rebase-continue\n' +
        '  git push --force-with-lease\n' +
        '  yarn pr:ship --merge-only --execute',
    );
  }
}

/**
 * Снимок mergeable текущего PR (или пустой объект, если gh недоступен).
 * @param {{run?: typeof execFileSync, branch?: string}} [opts]
 */
export function readPrMergeability(opts = {}) {
  const run = opts.run ?? execFileSync;
  try {
    const raw = run(
      'gh',
      ['pr', 'view', '--json', 'mergeable,mergeStateStatus,headRefName'],
      { encoding: 'utf8' },
    );
    const parsed = JSON.parse(raw);
    return {
      mergeable: parsed.mergeable ?? null,
      mergeStateStatus: parsed.mergeStateStatus ?? null,
      branch: parsed.headRefName ?? opts.branch ?? null,
    };
  } catch {
    return { mergeable: null, mergeStateStatus: null, branch: opts.branch ?? null };
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
  const { base = 'main', wait = true, branch, currentBranch, worktreeBranches } = opts;
  /** @type {{label:string,cmd:string,args:string[],optional?:boolean}[]} */
  const steps = [];
  let skippedSync;
  // #653 п.2: merge только после зелёного CI — pr-wait (#643) на PR текущей ветки
  // различает none/running/green/red; red и none-при-конфликте роняют флоу ДО merge.
  // --no-wait — осознанный обход (например, docs-only при выключенном CI).
  if (wait) steps.push({ label: 'ci-wait', cmd: 'node', args: ['scripts/pr-wait.mjs'] });
  // #653 п.1: БЕЗ --delete-branch. Он чекаутит base локально, а base почти всегда
  // держит соседний worktree (8+ деревьев) → прогон «падает» после УЖЕ УСПЕШНОГО
  // merge (ложный красный, #700). Remote-ветка удаляется отдельным шагом; локальная
  // остаётся (мы на ней стоим — её удаление и невозможно, и не нужно).
  steps.push({ label: 'merge', cmd: 'gh', args: ['pr', 'merge', '--squash'] });
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
    steps.push({ label: 'sync-checkout', cmd: 'git', args: ['checkout', base] });
    steps.push({ label: 'sync-fetch', cmd: 'git', args: ['fetch', 'origin', base] });
    steps.push({ label: 'sync-ff', cmd: 'git', args: ['merge', '--ff-only', `origin/${base}`] });
  }
  return { steps, skippedSync };
}

/**
 * @param {{type?:string,scope?:string,message?:string,issue?:number|string,branch?:string,base?:string,merge?:boolean,commit?:boolean,wait?:boolean,mergeOnly?:boolean,currentBranch?:string,localBranches?:string[],worktreeBranches?:string[],allowMentionWithoutClose?:boolean}} opts
 * @returns {{title:string,commitBody:string,steps:{label:string,cmd:string,args:string[]}[],skippedSync?:string}}
 */
export function planPrShip(opts) {
  const { type, scope, message, issue, branch, base = 'main', merge = true, commit = true, wait = true, mergeOnly = false } = opts;

  // --merge-only (#700): PR уже открыт — мёржим его безопасным хвостом, без
  // branch/commit/push/pr-create. Закрывает дыру: без этого режима «смёржить уже
  // открытый PR» тянуло к raw `gh pr merge --delete-branch` (ложный красный из worktree).
  // type/message тут не нужны (нет ни коммита, ни заголовка PR).
  if (mergeOnly) {
    if (branch) throw new Error('pr:ship: --merge-only несовместим с --branch (PR уже открыт на текущей ветке)');
    if (!merge) throw new Error('pr:ship: --merge-only и --no-merge взаимоисключают друг друга');
    const { steps, skippedSync } = planMergeTail({ base, wait, branch, currentBranch: opts.currentBranch, worktreeBranches: opts.worktreeBranches });
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
    const tail = planMergeTail({ base, wait, branch, currentBranch: opts.currentBranch, worktreeBranches: opts.worktreeBranches });
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
    else if (a === '--allow-mention') o.allowMentionWithoutClose = true;
    else if (a === '--execute') o.execute = true;
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv);
  // Ветки соседних worktree решают, возможен ли ff-sync (см. isBaseHeldElsewhere).
  // Гуард: без --branch коммит идёт в текущую ветку; запрет коммитить прямо в base.
  const current = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();

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

  // ATF4-1: до любого merge-шага — CONFLICTING/DIRTY = STOP
  if (opts.execute && opts.merge) {
    assertPrMergeableForShip(readPrMergeability({ branch: current }));
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
    console.log(`  → ${s.label}`);
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
    const raw = execFileSync('gh', ['pr', 'view', '--json', 'number,state'], { encoding: 'utf8' });
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
