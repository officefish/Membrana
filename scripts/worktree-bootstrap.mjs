#!/usr/bin/env node
/**
 * yarn worktree:bootstrap — подготовить sibling-worktree к agent-скриптам без полного
 * yarn install: junction/symlink на node_modules primary + опциональная копия .env.
 *
 * Живой случай 19.07: code-review в новом worktree → ERR_MODULE_NOT_FOUND (undici),
 * пока вручную не сделали mklink /J.
 *
 *   yarn worktree:bootstrap              # cwd = worktree
 *   yarn worktree:bootstrap --dry-run
 *   yarn worktree:bootstrap --no-env     # только modules
 *   yarn worktree:bootstrap --from <path-to-primary>
 */
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';

import {
  planWorktreeBootstrap,
  resolvePrimaryRepoRoot,
} from './lib/worktree-bootstrap.mjs';

function parseArgs(argv) {
  const o = { dryRun: false, linkEnv: true, mode: 'install' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--no-env') o.linkEnv = false;
    else if (a === '--junction') o.mode = 'junction';
    else if (a === '--from') o.from = argv[(i += 1)];
    else if (a === '--help' || a === '-h') o.help = true;
  }
  return o;
}

function runInstall(cwd) {
  // shell: yarn на Windows — .cmd, execFile без shell его не находит.
  execFileSync('yarn', ['install'], { cwd, stdio: 'inherit', shell: true });
}

function linkModules(source, target) {
  if (platform() === 'win32') {
    // Junction не требует admin; symlink directory часто требует.
    execFileSync('cmd', ['/c', 'mklink', '/J', target, source], { stdio: 'inherit' });
    return;
  }
  execFileSync('ln', ['-s', source, target], { stdio: 'inherit' });
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) {
    console.log(`Usage: yarn worktree:bootstrap [--dry-run] [--no-env] [--junction] [--from <primary-root>]

По умолчанию — СВОЙ yarn install в дереве (канон #725) + копия .env из primary.
--junction  подключить node_modules ссылкой на primary: дёшево, но АНТИ-ПАТТЕРН #725 —
            ломает resolve и прячет несобранные пакеты (29.07: rag-service, пять e2e).
            Выбранный способ пишется в WORKTREE.md.`);
    process.exitCode = 0;
    return;
  }

  const cwd = process.cwd();
  const primary = opts.from ?? resolvePrimaryRepoRoot(cwd);
  const plan = planWorktreeBootstrap({
    cwd,
    primaryRoot: primary,
    linkEnv: opts.linkEnv,
    mode: opts.mode,
  });

  console.log(`[worktree:bootstrap] cwd=${cwd}`);
  console.log(`[worktree:bootstrap] primary=${plan.primary ?? '(нет)'}`);
  for (const w of plan.warnings) console.error(`  ⚠ ${w}`);
  for (const s of plan.steps) console.log(`  · ${s.action}: ${s.detail}`);

  if (opts.dryRun) {
    console.log('(dry-run — ничего не сделано)');
    process.exitCode = plan.ok ? 0 : 1;
    return;
  }

  for (const s of plan.steps) {
    if (s.action === 'modules-install') {
      runInstall(cwd);
      console.log(`  → yarn install выполнен (своё дерево зависимостей, канон #725)`);
    } else if (s.action === 'modules-link') {
      const source = plan.sourceModules;
      const target = join(cwd, 'node_modules');
      linkModules(source, target);
      console.log(`  → linked node_modules`);
    } else if (s.action === 'env-copy') {
      const src = join(plan.primary, '.env');
      const dst = join(cwd, '.env');
      if (existsSync(src) && !existsSync(dst)) {
        copyFileSync(src, dst);
        console.log(`  → copied .env`);
      }
    }
  }

  // Инвариант регистрации (M1 worktree-hygiene-gaps, #717): create пишет карточку
  // атомарно — дерево без WORKTREE.md гейт классифицирует как unregistered-хвост.
  writeWorktreeCard(cwd, plan.mode);

  if (!plan.ok) {
    process.exitCode = 1;
    return;
  }
  console.log('[worktree:bootstrap] OK');
  process.exitCode = 0;
}

/** Карточка называет ФАКТИЧЕСКИЙ способ: до 29.07 здесь стояла константа «свой», и дерево
 *  на junction утверждало канонное состояние, которого у него не было (#1465 Ф4). */
export function installCell(mode) {
  return mode === 'junction'
    ? 'junction на primary (анти-паттерн #725 — выбран явно через --junction)'
    : 'свой (yarn install, канон #725)';
}

function writeWorktreeCard(cwd, mode = 'install') {
  const file = join(cwd, 'WORKTREE.md');
  if (existsSync(file)) return;
  let branch = '(detached)';
  try {
    branch =
      execFileSync('git', ['branch', '--show-current'], { cwd, encoding: 'utf8' }).trim() ||
      '(detached)';
  } catch {
    /* без git карточка всё равно нужна — с плейсхолдером ветки */
  }
  writeFileSync(
    file,
    [
      '# WORKTREE — карточка дерева',
      '',
      '| Поле | Значение |',
      '|---|---|',
      '| kind | sprint |',
      `| Ветка | ${branch} |`,
      '| Владелец | агент сессии (заполните имя) |',
      '| gc | запрещён (`gc.auto 0`); gc только в main-checkout |',
      `| install | ${installCell(mode)} |`,
      '',
      '> Спринт-дерево: срок жизни = жизнь PR его ветки. Снос — `yarn repo:clean`',
      '> по классу sprint-closed (PR merged/closed, без хвостов). Канон: #717.',
      '',
    ].join('\n'),
    'utf8',
  );
  console.log('  → WORKTREE.md (kind: sprint) — регистрация дерева');
}

// Guard запуска: без него `import` модуля ВЫПОЛНЯЛ main() — то есть чтение кода тестом
// начинало править дерево (линковать node_modules, писать WORKTREE.md). Та же форма, что
// у tooth.mjs / pr-wait.mjs / workspace-links.mjs.
if (process.argv[1]?.endsWith('worktree-bootstrap.mjs')) {
  try {
    main();
  } catch (e) {
    console.error(`[worktree:bootstrap] ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}
