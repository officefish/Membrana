#!/usr/bin/env node
/**
 * `yarn branch:status [--branch <имя>] [--json]` — отвечает на один вопрос:
 * **эту ветку сейчас безопасно двигать?**
 *
 * Слой 3 иссью #1759. Здесь порты — git и `gh`; все решения в чистом ядре
 * `scripts/lib/branch-status.mjs`, и потому проверяются зубами без репозитория.
 *
 * Exit: 0 — safe · 1 — blocked (это СОСТОЯНИЕ дома, не сбой глагола) · 2 — ошибка входа.
 */
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BRANCH_STATUS_LIMITS, branchStatus, formatBranchStatus } from './lib/branch-status.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const git = (args, fallback = null, opts = {}) => {
  try {
    // stderr глушится: отсутствие upstream у влитой и удалённой ветки — ожидаемое
    // состояние, а не сбой; `fatal:` в выводе читался бы как поломка глагола. Настоящая
    // недоступность порта ловится ниже по `null` и печатается как «проверка НЕ состоялась».
    const out = String(execFileSync('git', args, {
      cwd: repoRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
    })).trim();
    // `probe` — команды, у которых ответ в коде возврата, а не в выводе (`--is-ancestor`).
    return opts.probe ? true : out;
  } catch {
    return opts.probe ? false : fallback;
  }
};

export function parseArgs(argv) {
  const out = { branch: null, json: false, base: 'origin/main' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--branch') out.branch = argv[++i] ?? null;
    else if (a === '--base') out.base = argv[++i] ?? out.base;
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`неизвестный аргумент «${a}»`);
  }
  return out;
}

/**
 * Коммиты, чьего СОДЕРЖАНИЯ нет в стволе. `git cherry` сравнивает по patch-id, а не по
 * предкам: после squash-мерджа ветка выглядит неслитой для `git branch --merged`, хотя её
 * содержание в стволе целиком (замер #492 — «`git branch --merged` здесь врёт»).
 */
function unmergedByContent(base, branch) {
  const out = git(['cherry', base, branch]);
  if (out === null) return null; // порт не подключился — судить нечем, и это не «пусто»
  return out
    .split('\n')
    .filter((l) => l.startsWith('+ '))
    .map((l) => l.slice(2).trim())
    .filter(Boolean);
}

/** Коммиты, которых нет в origin: их перецеливание ветки потеряет молча. */
function unpushedCommits(branch) {
  const upstream = git(['rev-parse', '--abbrev-ref', `${branch}@{upstream}`]);
  if (upstream === null) {
    // Ветка без upstream — всё, что на ней, ещё нигде: считаем незапушенным то, чего нет
    // ни в одной origin-ветке, а не «ничего», иначе отказ промолчит там, где обязан кричать.
    const out = git(['rev-list', branch, '--not', '--remotes=origin']);
    return out === null ? null : out.split('\n').filter(Boolean);
  }
  const out = git(['rev-list', `${upstream}..${branch}`]);
  return out === null ? null : out.split('\n').filter(Boolean);
}

/** PR по имени ветки. Сеть недоступна — возвращаем null: «не знаю» ≠ «их нет». */
function pullRequestsOf(branch) {
  try {
    const raw = execFileSync(
      'gh',
      ['pr', 'list', '--head', branch, '--state', 'all', '--json', 'number,state,mergeCommit,commits'],
      { cwd: repoRoot, encoding: 'utf8', timeout: 20_000, stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Влитые PR ветки, чей merge-коммит ДЕЙСТВИТЕЛЬНО лежит в стволе. Состояния `MERGED` мало:
 * GitHub помнит мердж и в чужую базу, а прощать коммиты можно только против той базы,
 * относительно которой мы судим.
 */
function deliveredPullRequests(base, pullRequests) {
  const out = [];
  for (const pr of pullRequests ?? []) {
    if (String(pr?.state).toUpperCase() !== 'MERGED') continue;
    const mergeCommit = pr?.mergeCommit?.oid;
    if (!mergeCommit) continue;
    const inBase = git(['merge-base', '--is-ancestor', mergeCommit, base], null, { probe: true });
    out.push({
      number: pr.number,
      commits: (pr.commits ?? []).map((c) => c.oid).filter(Boolean),
      mergeCommitInBase: inBase === true,
    });
  }
  return out;
}

function main(argv) {
  let cli;
  try {
    cli = parseArgs(argv);
  } catch (e) {
    console.error(`branch:status — ошибка входа: ${e.message}`);
    return 2;
  }
  if (cli.help) {
    console.log('Usage: yarn branch:status [--branch <имя>] [--base origin/main] [--json]');
    console.log('\nОтвечает: safe | blocked:<причины>. Предел глагола:');
    for (const l of BRANCH_STATUS_LIMITS) console.log(`  · ${l}`);
    return 0;
  }

  const branch = cli.branch ?? git(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!branch || branch === 'HEAD') {
    console.error('branch:status — ветка не определилась (detached HEAD?) — назови её через --branch');
    return 2;
  }

  const unpushed = unpushedCommits(branch);
  const unmergedContent = unmergedByContent(cli.base, branch);
  const pullRequests = pullRequestsOf(branch);

  // Недоступный порт — ошибка входа, а не «безопасно». Молчаливое `safe` на неполном
  // снимке было бы ровно тем ложным зелёным, ради которого глагол и заводился.
  const missing = [];
  if (unpushed === null) missing.push('git rev-list (незапушенные)');
  if (unmergedContent === null) missing.push('git cherry (содержание в стволе)');
  if (pullRequests === null) missing.push('gh pr list (живые PR)');
  if (missing.length > 0) {
    console.error(`branch:status — проверка НЕ состоялась: недоступно ${missing.join(', ')}. «Не знаю» не значит «безопасно»`);
    return 2;
  }

  const verdict = branchStatus({
    branch,
    pullRequests,
    unpushed,
    unmergedContent,
    mergedPullRequests: deliveredPullRequests(cli.base, pullRequests),
  });

  if (cli.json) {
    process.stdout.write(`${JSON.stringify({ ...verdict, limits: BRANCH_STATUS_LIMITS }, null, 2)}\n`);
  } else {
    for (const line of formatBranchStatus(verdict)) console.log(line);
    if (!verdict.safe) console.log(`  предел глагола: ${BRANCH_STATUS_LIMITS[0]}`);
  }
  return verdict.safe ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}

export { main };
