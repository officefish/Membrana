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
 * Логика планирования (planPrShip) — чистая и покрыта тестом; CLI лишь исполняет/печатает.
 */
import { execFileSync } from 'node:child_process';

const TRAILER = 'Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>';

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
 * @param {{type:string,scope?:string,message:string,issue?:number|string,branch?:string,base?:string,merge?:boolean,commit?:boolean,worktreeBranches?:string[],allowMentionWithoutClose?:boolean}} opts
 * @returns {{title:string,commitBody:string,steps:{label:string,cmd:string,args:string[]}[],skippedSync?:string}}
 */
export function planPrShip(opts) {
  const { type, scope, message, issue, branch, base = 'main', merge = true, commit = true } = opts;
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
  if (branch) steps.push({ label: 'branch', cmd: 'git', args: ['checkout', '-b', branch] });
  if (commit) steps.push({ label: 'commit', cmd: 'git', args: ['commit', '-m', commitBody] });
  steps.push({ label: 'push', cmd: 'git', args: ['push', '-u', 'origin', 'HEAD'] });
  steps.push({
    label: 'pr-create',
    cmd: 'gh',
    args: ['pr', 'create', '--base', base, '--title', title, '--body', closes ? closes.trim() : title],
  });
  let skippedSync;
  if (merge) {
    steps.push({ label: 'merge', cmd: 'gh', args: ['pr', 'merge', '--squash', '--delete-branch'] });
    if (isBaseHeldElsewhere(base, opts.worktreeBranches)) {
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
    else if (a === '--allow-mention') o.allowMentionWithoutClose = true;
    else if (a === '--execute') o.execute = true;
  }
  return o;
}

function main() {
  const opts = parseArgs(process.argv);
  // Ветки соседних worktree решают, возможен ли ff-sync (см. isBaseHeldElsewhere).
  const { title, steps, skippedSync } = planPrShip({
    ...opts,
    worktreeBranches: otherWorktreeBranches(),
  });

  // Гуард: без --branch коммит идёт в текущую ветку; запрет коммитить прямо в base.
  const current = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
  if (!opts.branch && current === opts.base) {
    throw new Error(`pr:ship: на ветке "${opts.base}" без --branch — отказ (не коммитим прямо в base).`);
  }

  console.log(`pr:ship${opts.execute ? '' : ' [DRY-RUN]'}: ${title}`);
  if (skippedSync) console.log(`  ⚠ ${skippedSync}`);
  for (const s of steps) {
    const printable = `${s.cmd} ${s.args.map((a) => (a.includes('\n') || a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}`;
    if (!opts.execute) {
      console.log(`  · ${s.label}: ${printable.slice(0, 200)}`);
      continue;
    }
    console.log(`  → ${s.label}`);
    execFileSync(s.cmd, s.args, { stdio: 'inherit' });
  }
  if (!opts.execute) console.log('\n(dry-run — ничего не выполнено; добавь --execute)');
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
