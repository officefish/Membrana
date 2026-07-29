#!/usr/bin/env node
/**
 * repo-clean — убрать мёртвые ветки и worktree (#492).
 *
 * Классификация ТОЛЬКО по состоянию PR на GitHub: репозиторий мёржит squash,
 * поэтому `git branch --merged` слеп (замер 2026-07-15 — видит 9 влитых из 42
 * реально мёртвых). Правила и гарды — в lib/repo-clean.mjs, здесь I/O и отчёт.
 *
 *   yarn repo:clean                 # dry-run: только отчёт, ничего не трогает
 *   yarn repo:clean --execute       # удалить локальные ветки
 *   yarn repo:clean --execute --remote     # + удалить ветки на origin
 *   yarn repo:clean --execute --worktrees  # + убрать worktree архивных спринтов
 *   yarn repo:clean --report clean.txt      # отчёт целиком на диск
 *
 * Ничего не удаляется молча: всё пропущенное печатается с причиной.
 */
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyWorktree, parseWorktreeCard } from './lib/classify-worktree.mjs';
import {
  newDeletions,
  resolveLinkTarget,
  targetIsOutsideTree,
} from './lib/junction-safety.mjs';
import {
  decideBranch,
  decideWorktree,
  groupByReason,
  latestPrByBranch,
  rootScratchFiles,
} from './lib/repo-clean.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = 'officefish/Membrana';

export function parseCli(argv) {
  const reportIndex = argv.indexOf('--report');
  return {
    execute: argv.includes('--execute'),
    remote: argv.includes('--remote'),
    worktrees: argv.includes('--worktrees'),
    // `--report <файл>`: отчёт целиком на диск. Живой случай 2026-07-15 — прогон
    // ушёл через `| tail -18`, текст двух ошибок потерялся, причину пришлось
    // восстанавливать по состоянию диска. Консоль обрезают, файл — нет.
    report: reportIndex > -1 ? argv[reportIndex + 1] : null,
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

/**
 * Пишет в консоль И копит строки для файла-отчёта. Ошибки идут в stderr, но в
 * отчёт попадают в общем потоке — иначе файл терял бы ровно то, ради чего заведён.
 */
export function createReporter() {
  const lines = [];
  return {
    lines,
    log(text = '') {
      lines.push(String(text));
      console.log(text);
    },
    error(text = '') {
      lines.push(String(text));
      console.error(text);
    },
  };
}

function git(args, cwd = repoRoot) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function gitLines(args, cwd = repoRoot) {
  return git(args, cwd).split('\n').map((s) => s.trim()).filter(Boolean);
}

function fetchPrs() {
  const raw = execSync(
    `gh pr list --state all --limit 500 --json number,state,headRefName,headRefOid --repo ${REPO}`,
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
  return JSON.parse(raw);
}

/** Ветки, занятые worktree: удалить их git всё равно не даст, но причина должна быть внятной. */
function worktreeBranches() {
  const branches = new Set();
  for (const line of gitLines(['worktree', 'list', '--porcelain'])) {
    if (line.startsWith('branch ')) branches.add(line.replace('branch refs/heads/', '').trim());
  }
  return branches;
}

function listWorktrees() {
  const out = [];
  let current = null;
  for (const line of git(['worktree', 'list', '--porcelain']).split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current) out.push(current);
      current = { path: line.slice('worktree '.length).trim(), branch: null, locked: false };
    } else if (line.startsWith('branch ')) {
      current.branch = line.replace('branch refs/heads/', '').trim();
    } else if (line.startsWith('locked')) {
      current.locked = true;
    }
  }
  if (current) out.push(current);
  return out;
}

function hasRemoteBranch(remoteSet, name) {
  return remoteSet.has(name);
}

function aheadOfMain(branch) {
  try {
    return Number(git(['rev-list', '--count', `origin/main..${branch}`]));
  } catch {
    return 0;
  }
}

/** Карточка дерева (WORKTREE.md) — носитель различителя canon/sprint (M1). */
function readWorktreeCard(wtPath) {
  const file = resolve(wtPath, 'WORKTREE.md');
  if (!existsSync(file)) return null;
  try {
    return parseWorktreeCard(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Локальные коммиты, которых нет снаружи. После squash-мёржа remote-ветку обычно
 * удаляют, поэтому «ahead origin/main» тут не годится (squash делает его >0 всегда):
 * при живом origin/<branch> считаем против него, иначе сверяем tip с headRefOid PR —
 * совпал → всё, что было в PR, снаружи есть. Непонятно → 1 (fail-closed, не сносить).
 */
function unpushedCount(branch, pr) {
  try {
    return Number(git(['rev-list', '--count', `origin/${branch}..${branch}`]));
  } catch {
    /* origin-ветки нет — сверяем с PR */
  }
  if (pr?.headRefOid) {
    try {
      return git(['rev-parse', branch]) === pr.headRefOid
        ? 0
        : Number(git(['rev-list', '--count', `${pr.headRefOid}..${branch}`]));
    } catch {
      return 1;
    }
  }
  return aheadOfMain(branch) > 0 ? 1 : 0;
}

/**
 * Таблица классификации K2 (вердикт M1: provenance каждой строки обязателен).
 * `unknown` — отдельной строкой: состояние PR недоступно, снос запрещён.
 */
function reportWorktreeClasses(out, wts) {
  out.log('\nКлассы lifecycle (K2, истина — состояние PR):');
  const order = ['canon', 'sprint-closed', 'sprint-open', 'unregistered'];
  for (const cls of order) {
    for (const w of wts.filter((x) => x.class === cls)) {
      out.log(`  ${cls.padEnd(13)} ${w.path} · ${w.branch ?? 'detached'} · ${w.reason}`);
    }
  }
  const unknown = wts.filter((w) => w.class === 'unknown');
  if (unknown.length > 0) {
    out.log('  — unknown (не сносить):');
    for (const w of unknown) out.log(`    ${w.path} · ${w.branch ?? 'detached'} · ${w.reason}`);
  }
}

function report(out, title, groups) {
  out.log(`\n${title}`);
  if (groups.size === 0) {
    out.log('  —');
    return;
  }
  for (const [reason, names] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    out.log(`  ${names.length.toString().padStart(3)} · ${reason}`);
    if (names.length <= 12) for (const n of names) out.log(`        ${n}`);
  }
}

function main() {
  const cli = parseCli(process.argv.slice(2));
  if (cli.help) {
    console.log(`Usage: yarn repo:clean [--execute] [--remote] [--worktrees]

  По умолчанию — dry-run: печатает решения и НИЧЕГО не трогает.
  --execute     удалить локальные мёртвые ветки
  --remote      вместе с --execute: удалить их и на origin
  --worktrees   вместе с --execute: убрать worktree архивных спринтов
  --report <файл>  сохранить отчёт целиком (консоль обрезают пайпом, файл — нет)

  Мертва = ветка с PR в состоянии MERGED или CLOSED. Всё остальное
  (открытый PR, нет PR, персона-ветка, занята worktree) — остаётся.`);
    return;
  }

  const out = createReporter();
  out.log('repo-clean · источник истины — состояние PR (squash-мёрж делает git branch --merged слепым)');
  const prs = fetchPrs();
  const prByBranch = latestPrByBranch(prs);
  const currentBranch = git(['branch', '--show-current']);
  const wtBranches = worktreeBranches();

  const remoteSet = new Set(
    gitLines(['branch', '-r', '--format=%(refname:short)'])
      .filter((b) => b && !b.includes('HEAD'))
      .map((b) => b.replace(/^origin\//, '')),
  );

  out.log(`PR: ${prs.length} · ветка сессии: ${currentBranch} · worktree занимают ${wtBranches.size} веток`);

  // ─── локальные ветки ────────────────────────────────────────────────────────────
  const locals = gitLines(['branch', '--format=%(refname:short)']);
  const localDecisions = locals.map((name) =>
    decideBranch(
      { name, hasRemote: hasRemoteBranch(remoteSet, name), aheadOfMain: aheadOfMain(name) },
      prByBranch,
      { worktreeBranches: wtBranches, currentBranch },
    ),
  );
  const localDead = localDecisions.filter((d) => d.delete);
  report(out, `Локальные ветки (${locals.length}) — УДАЛИТЬ ${localDead.length}:`, groupByReason(localDead));
  report(out, 'Локальные — оставить:', groupByReason(localDecisions.filter((d) => !d.delete)));

  // ─── удалённые ветки ────────────────────────────────────────────────────────────
  const remotes = [...remoteSet].filter((b) => b !== 'main');
  const remoteDecisions = remotes.map((name) =>
    decideBranch({ name, hasRemote: true, aheadOfMain: 0 }, prByBranch, {
      worktreeBranches: wtBranches,
      currentBranch,
    }),
  );
  const remoteDead = remoteDecisions.filter((d) => d.delete);
  report(out, `Удалённые ветки (${remotes.length}) — УДАЛИТЬ ${remoteDead.length}:`, groupByReason(remoteDead));
  report(out, 'Удалённые — оставить:', groupByReason(remoteDecisions.filter((d) => !d.delete)));

  // ─── worktree: lifecycle-классификация K2 (#717), истина — состояние PR ─────────
  const wts = listWorktrees().map((wt, index) => {
    const exists = existsSync(wt.path);
    const dirtyCount = exists ? gitLines(['status', '--porcelain'], wt.path).length : 0;
    const card = exists ? readWorktreeCard(wt.path) : null;
    const pr = wt.branch ? (prByBranch.get(wt.branch) ?? null) : null;
    const classification = classifyWorktree({
      path: wt.path,
      branch: wt.branch,
      card,
      dirtyCount,
      unpushedCount: wt.branch ? unpushedCount(wt.branch, pr) : 0,
      pr: pr ? { number: pr.number, state: pr.state } : null,
    });
    return decideWorktree(
      {
        ...wt,
        isMain: index === 0,
        isCurrent: resolve(wt.path) === resolve(repoRoot),
      },
      classification,
    );
  });
  const wtDead = wts.filter((w) => w.remove);
  report(out, `Worktree (${wts.length}) — УБРАТЬ ${wtDead.length}:`, groupByReason(wtDead));
  report(out, 'Worktree — оставить:', groupByReason(wts.filter((w) => !w.remove)));
  reportWorktreeClasses(out, wts);

  if (!cli.execute) {
    out.log('\ndry-run: ничего не тронуто. Реально удалить — --execute [--remote] [--worktrees].');
    writeReport(cli, out);
    return;
  }

  // ─── исполнение ─────────────────────────────────────────────────────────────────
  let removed = 0;
  let failed = 0;

  if (cli.worktrees) {
    // prune ДО удалений — убрать записи о деревьях, которых уже нет на диске.
    // После удалений он опасен: маскирует упавший remove (git забывает worktree,
    // а каталог остаётся). Живой случай на Windows — два осиротевших каталога по 1.5 ГБ.
    git(['worktree', 'prune']);
    // #1436: снимок удалений main-дерева ДО сносов — пост-чек ловит проход
    // рекурсивного удаления сквозь связь наружу (инциденты 20.07 и 29.07).
    const deletionsBefore = mainTreeStatus();
    for (const w of wtDead) {
      // #1436: связи, ведущие НАРУЖУ сносимого дерева, снимаются как связи —
      // иначе remove --force удаляет сквозь них чужие файлы (29.07: 2097 в main).
      try {
        neutralizeOutboundLinks(w.path, out);
      } catch (e) {
        out.error(`  worktree ПРОПУЩЕН (скан связей упал): ${w.path} — ${e.message.split('\n')[0]}`);
        failed++;
        continue;
      }
      let ok = false;
      for (const args of [['worktree', 'remove', w.path], ['worktree', 'remove', '--force', w.path]]) {
        try {
          git(args);
          ok = true;
          break;
        } catch {
          /* пробуем --force: на Windows remove падает о блокировки в node_modules */
        }
      }
      if (ok && !existsSync(w.path)) {
        out.log(`  worktree removed: ${w.path}`);
        removed++;
        continue;
      }
      // Каталог пережил удаление — сказать об этом прямо, а не прятать за prune.
      out.error(
        `  worktree ОСТАЛСЯ НА ДИСКЕ: ${w.path}\n` +
          '      git-запись снята, файлы нет (Windows держит node_modules). Убрать вручную.',
      );
      failed++;
    }
    // #1436: пост-чек — не появились ли в main-дереве НОВЫЕ удаления после сносов.
    const lost = newDeletions(deletionsBefore, mainTreeStatus());
    if (lost.length > 0) {
      out.error(
        `\n  ██ СТОП #1436: после сноса деревьев в main-дереве ${lost.length} НОВЫХ удалений ` +
          `(${lost.slice(0, 3).join(', ')}${lost.length > 3 ? '…' : ''})\n` +
          '     Восстановить НЕМЕДЛЕННО: git restore -- <пути> (tracked вернутся из HEAD).\n' +
          '     Это проход удаления сквозь связь наружу — вектор инцидентов 20.07/29.07.\n' +
          '     Дальнейшие сносы ОСТАНОВЛЕНЫ: разрушать дальше поверх находки нельзя.',
      );
      failed++;
      // Hard-stop: код 2 — отличимый сигнал инцидента, и ни одного удаления после
      // детекта. Хвост main() сюда не доходит, потому exitCode не перетирается.
      reportRootScratch(out);
      out.log(`\nОСТАНОВЛЕНО по #1436: убрано ${removed}, ошибок ${failed}.`);
      writeReport(cli, out);
      process.exitCode = 2;
      return;
    }
  }

  for (const d of localDead) {
    try {
      // -D, а не -d: при squash-мёрже git не считает ветку влитой и -d откажет.
      // Право на удаление даёт состояние PR, а не git-предки.
      git(['branch', '-D', d.name]);
      out.log(`  local deleted: ${d.name} (${d.reason})`);
      removed++;
    } catch (e) {
      out.error(`  local FAIL ${d.name}: ${e.message.split('\n')[0]}`);
      failed++;
    }
  }

  if (cli.remote) {
    for (const d of remoteDead) {
      try {
        git(['push', 'origin', '--delete', d.name]);
        out.log(`  remote deleted: ${d.name} (${d.reason})`);
        removed++;
      } catch (e) {
        out.error(`  remote FAIL ${d.name}: ${e.message.split('\n')[0]}`);
        failed++;
      }
    }
  }

  reportRootScratch(out);
  out.log(`\nГотово: убрано ${removed}, ошибок ${failed}.`);
  writeReport(cli, out);
  if (failed > 0) process.exitCode = 1;
}

/**
 * `git status --porcelain` main-дерева (this checkout) — сырьё пост-чека #1436.
 * Ошибка git здесь не валит снос: пост-чек тогда честно пропускается с воплем.
 */
function mainTreeStatus() {
  try {
    return execSync('git status --porcelain', { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    console.error(`  ⚠ пост-чек #1436: git status main-дерева не собрался (${e.message.split('\n')[0]})`);
    return '';
  }
}

/**
 * Снять связи (symlink/junction), ведущие НАРУЖУ дерева, ПЕРЕД его сносом (#1436).
 * Снимается сам линк (unlink/rmdir), цель не трогается. Обход пропускает .git.
 */
function neutralizeOutboundLinks(treeRoot, out) {
  const stack = [treeRoot];
  let cut = 0;
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue; // каталог исчез/недоступен — не повод ронять весь скан
    }
    for (const e of entries) {
      if (e.name === '.git') continue;
      const p = resolve(dir, e.name);
      let st;
      try {
        st = lstatSync(p);
      } catch {
        continue;
      }
      if (st.isSymbolicLink()) {
        const target = resolveLinkTarget(p, readlinkSync(p));
        if (targetIsOutsideTree(target, treeRoot)) {
          try {
            st.isDirectory() ? rmdirSync(p) : unlinkSync(p);
          } catch {
            // директория-junction под lstat не isDirectory — пробуем оба глагола
            try {
              rmdirSync(p);
            } catch {
              unlinkSync(p);
            }
          }
          out.log(`    связь наружу снята: ${p} → ${target}`);
          cut++;
        }
        continue; // внутрь связей не ходим — даже внутренних
      }
      if (st.isDirectory()) stack.push(p);
    }
  }
  if (cut > 0) out.log(`  связей наружу снято: ${cut} (${treeRoot})`);
}

/**
 * Черновики в корне репозитория — ПРЕДУПРЕЖДЕНИЕ, не блок.
 *
 * Повод (18.07): в корне лежали пять файлов чужой сессии — два черновика
 * текстов и три одноразовых скрипта разбора. За ними стояла настоящая работа
 * (issue #609, PR #612), поэтому автоматическое удаление снесло бы живое.
 * Отсюда правило: страж НАЗЫВАЕТ, судьбу решает владелец дерева.
 *
 * Канон уже требует держать временное в `%TEMP%` / `$TMPDIR` — проверки не было.
 */
function reportRootScratch(out) {
  let untracked = [];
  try {
    untracked = execSync('git status --porcelain --untracked-files=all', {
      cwd: repoRoot,
      encoding: 'utf8',
    })
      .split(/\r?\n/)
      .filter((line) => line.startsWith('?? '))
      .map((line) => line.slice(3));
  } catch {
    return; // git недоступен — чистка веток уже сделана, отчёт не роняем
  }

  const scratch = rootScratchFiles(untracked);
  if (scratch.length === 0) return;

  out.log('');
  out.log(`--- ЧЕРНОВИКИ В КОРНЕ (${scratch.length}) ---`);
  out.log('Временному место в %TEMP% / $TMPDIR. Ничего не удалено — решает владелец дерева.');
  for (const file of scratch) {
    out.log(`  ${file.path} — ${file.hint}`);
  }
}

/**
 * Сохранить отчёт целиком. Пишется и в dry-run, и после `--execute`: разбирать
 * потом приходится именно упавший прогон. Провал записи не роняет саму чистку —
 * она уже сделана, терять её из-за отчёта нельзя.
 */
function writeReport(cli, out) {
  if (!cli.report) return;
  try {
    writeFileSync(resolve(process.cwd(), cli.report), out.lines.join('\n') + '\n', 'utf8');
    console.log(`\nОтчёт: ${cli.report}`);
  } catch (e) {
    console.error(`\nОтчёт не записан (${cli.report}): ${e.message}`);
  }
}

// Гард запуска: без него импорт из теста полез бы в gh и git.
if (process.argv[1]?.endsWith('repo-clean.mjs')) {
  try {
    main();
  } catch (e) {
    console.error('repo-clean ERR:', e.message);
    process.exitCode = 1;
  }
}
