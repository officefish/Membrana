/**
 * replit-task — отправить задание Replit-агенту ПРЯМО ИЗ РЕПОЗИТОРИЯ.
 *
 * У Replit-агента нет публичного API приёма задания из кода, поэтому транспорт — git:
 * скрипт кладёт бриф в docs/replit-tasks/<slug>.md и пушит ветку replit/<slug>. В Repl,
 * подключённом к репо, делаешь `git pull` и говоришь агенту «построй по этому брифу».
 *
 * Ветка создаётся в ИЗОЛИРОВАННОМ worktree от base (origin/main) — текущее рабочее
 * дерево не трогается (важно при параллельных сессиях).
 *
 *   yarn replit:task <slug> "текст брифа"            # демо-имя = slug
 *   yarn replit:task <slug> --demo MyDemo --brief-file docs/brief.md
 *   yarn replit:task <slug> "..." --dry-run          # только показать бриф, без ветки/пуша
 *   yarn replit:task <slug> "..." --base origin/main
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

import {
  validateSlug,
  taskBranchName,
  taskDocPath,
  buildTaskBrief,
  flagValue,
  positionalArgs,
} from './lib/replit-bridge.mjs';

const VALUE_FLAGS = ['--demo', '--brief-file', '--base'];

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || argv.length === 0) {
  console.log(`Usage: yarn replit:task <slug> ["бриф"] [--demo <Name>] [--brief-file <path>] [--dry-run] [--base <ref>]

  <slug>          kebab-case: имя ветки replit/<slug> и файла docs/replit-tasks/<slug>.md
  "бриф"          текст задания (или --brief-file)
  --demo <Name>   имя демо-папки apps/demos/<Name> (по умолчанию = slug)
  --brief-file    прочитать бриф из файла
  --dry-run       только записать/показать бриф локально, без ветки и пуша
  --base <ref>    база ветки (по умолчанию origin/main)`);
  process.exitCode = 0;
} else {
  try {
    main();
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

function git(args, opts = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    cwd: opts.cwd ?? process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 12 * 1024 * 1024,
  });
}

function main() {
  const repoRoot = process.cwd();
  const positional = positionalArgs(argv, VALUE_FLAGS);
  const slug = validateSlug(positional[0] ?? '', 'slug');
  const demoName = validateSlug(flagValue(argv, '--demo') ?? slug, 'demo');
  const base = flagValue(argv, '--base') ?? 'origin/main';
  const dryRun = argv.includes('--dry-run');

  let brief = positional.slice(1).join(' ').trim();
  const briefFile = flagValue(argv, '--brief-file');
  if (briefFile) {
    const p = resolve(repoRoot, briefFile);
    if (!existsSync(p)) {
      throw new Error(`brief-file не найден: ${p}`);
    }
    brief = readFileSync(p, 'utf8').trim();
  }
  if (!brief) {
    throw new Error('Бриф пуст: передай текст задания или --brief-file. Агент без брифа бесполезен.');
  }

  const doc = buildTaskBrief({ slug, demoName, brief });
  const docRel = taskDocPath(slug);
  const branch = taskBranchName(slug);

  if (dryRun) {
    const out = resolve(repoRoot, docRel);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, `${doc}\n`, 'utf8');
    console.error(`[dry-run] бриф записан: ${docRel} (ветка/пуш пропущены)`);
    console.error(`[dry-run] когда готов отправить: убери --dry-run.`);
    console.log(doc);
    process.exitCode = 0;
    return;
  }

  // Свежий base из origin.
  git(['fetch', 'origin', '--quiet'], { cwd: repoRoot });

  const wt = join(tmpdir(), `replit-task-${slug}-${process.pid}`);
  try {
    git(['worktree', 'add', '--quiet', '-b', branch, wt, base], { cwd: repoRoot });
    const outPath = join(wt, docRel);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${doc}\n`, 'utf8');
    git(['add', '--', docRel], { cwd: wt });
    git(['commit', '--quiet', '-m', `chore(replit): задание агенту — ${demoName} (${slug})`], { cwd: wt });
    git(['push', '--quiet', '-u', 'origin', branch], { cwd: wt });
    console.error(`Задание отправлено веткой: ${branch}`);
    console.error(`   Бриф: ${docRel}`);
    console.error('');
    console.error('В Replit (Repl подключён к этому репо):');
    console.error(`   1) git fetch && git checkout ${branch} && git pull`);
    console.error(`   2) Агенту: «Построй по ${docRel}. Всё строго внутри apps/demos/${demoName}/».`);
    console.error(`   3) Агент коммитит и пушит ветку ${branch}.`);
    console.error('');
    console.error(`Забрать работу сюда: yarn replit:pull-demo ${slug} ${demoName}`);
    process.exitCode = 0;
  } catch (e) {
    console.error('Ошибка отправки задания:', e.stderr?.toString?.() || e.message);
    process.exitCode = 1;
  } finally {
    try {
      git(['worktree', 'remove', '--force', wt], { cwd: repoRoot });
    } catch {
      /* worktree already gone */
    }
  }
}
