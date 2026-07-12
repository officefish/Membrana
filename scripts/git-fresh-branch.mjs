#!/usr/bin/env node
/**
 * git-fresh-branch — создать ветку ВСЕГДА от свежего origin/<base>, не от локального.
 *
 * Защита от параллельных сессий (CLAUDE.md): локальный main мог быть загрязнён
 * чужим коммитом. Ветвление от origin/<base> после fetch исключает это.
 *
 * Usage: node scripts/git-fresh-branch.mjs <branch-name> [<base>]  (base по умолчанию main)
 */

import { execFileSync } from 'node:child_process';

/** Валидный git-ref-name (без пробелов/спецсимволов, не начинается с -). */
export function isValidBranchName(name) {
  return typeof name === 'string' && /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(name) && !name.includes('..');
}

function git(args) {
  return execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
}

function main() {
  const branch = process.argv[2];
  const base = process.argv[3] || 'main';
  if (!isValidBranchName(branch)) {
    console.error('Usage: node scripts/git-fresh-branch.mjs <branch-name> [<base>]');
    console.error('  branch-name: буквы/цифры/._-/ (без пробелов, не с дефиса)');
    process.exit(1);
  }
  git(['fetch', 'origin', base, '--quiet']);
  git(['checkout', '-b', branch, `origin/${base}`]);
  console.log(`✓ ветка ${branch} создана от origin/${base} (свежая, без локального дрейфа)`);
}

if (process.argv[1]?.endsWith('git-fresh-branch.mjs')) {
  main();
}
