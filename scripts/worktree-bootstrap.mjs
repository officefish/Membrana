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
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { platform } from 'node:os';

import {
  planWorktreeBootstrap,
  resolvePrimaryRepoRoot,
} from './lib/worktree-bootstrap.mjs';

function parseArgs(argv) {
  const o = { dryRun: false, linkEnv: true };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--dry-run') o.dryRun = true;
    else if (a === '--no-env') o.linkEnv = false;
    else if (a === '--from') o.from = argv[(i += 1)];
    else if (a === '--help' || a === '-h') o.help = true;
  }
  return o;
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
    console.log(`Usage: yarn worktree:bootstrap [--dry-run] [--no-env] [--from <primary-root>]

Подключает node_modules (junction/symlink) и при необходимости копирует .env
из primary checkout (git-common-dir). Полный yarn install не запускает.`);
    process.exitCode = 0;
    return;
  }

  const cwd = process.cwd();
  const primary = opts.from ?? resolvePrimaryRepoRoot(cwd);
  const plan = planWorktreeBootstrap({
    cwd,
    primaryRoot: primary,
    linkEnv: opts.linkEnv,
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
    if (s.action === 'modules-link') {
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

  if (!plan.ok) {
    process.exitCode = 1;
    return;
  }
  console.log('[worktree:bootstrap] OK');
  process.exitCode = 0;
}

try {
  main();
} catch (e) {
  console.error(`[worktree:bootstrap] ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
