#!/usr/bin/env node
/**
 * git-check-divergence — предупреждает, если локальная вет[ка] разошлась с origin.
 *
 * Ловит риск параллельных сессий (CLAUDE.md): другая сессия закоммитила в общий
 * локальный main → мой ff-pull разваливается. Этот скрипт детектит расхождение ДО,
 * а не после. WARN-семантика: exit 0 всегда для 'in-sync'/'behind'; exit 1 для
 * 'ahead'/'diverged' (локальный имеет коммиты, которых нет в origin — подозрение
 * на чужой коммит), чтобы можно было опционально вплести в хук как предупреждение.
 *
 * Usage: node scripts/git-check-divergence.mjs [<branch>]  (по умолчанию main)
 */

import { execFileSync } from 'node:child_process';

/**
 * Чистая классификация по трём SHA. Тестируется без git.
 * @returns {'in-sync'|'behind'|'ahead'|'diverged'}
 */
export function classifyDivergence(localSha, originSha, baseSha) {
  if (localSha === originSha) return 'in-sync';
  if (baseSha === localSha) return 'behind'; // локальный — предок origin (просто отстал)
  if (baseSha === originSha) return 'ahead'; // локальный имеет коммиты, которых нет в origin
  return 'diverged'; // обе стороны имеют уникальные коммиты
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function main() {
  const branch = process.argv[2] || 'main';
  try {
    git(['fetch', 'origin', branch, '--quiet']);
  } catch {
    /* offline — продолжаем с локальным origin-ref */
  }
  const localSha = git(['rev-parse', branch]);
  const originSha = git(['rev-parse', `origin/${branch}`]);
  const baseSha = git(['merge-base', branch, `origin/${branch}`]);
  const state = classifyDivergence(localSha, originSha, baseSha);

  if (state === 'in-sync') {
    console.log(`✓ ${branch} в синхроне с origin/${branch}`);
    process.exit(0);
  }
  if (state === 'behind') {
    console.log(`↓ ${branch} отстаёт от origin/${branch} — безопасно: git pull --ff-only`);
    process.exit(0);
  }
  // ahead / diverged — подозрение на чужой коммит в общий локальный branch
  const localOnly = git(['log', `origin/${branch}..${branch}`, '--oneline']);
  console.warn(`⚠ ${branch} РАЗОШЁЛСЯ с origin/${branch} (${state}). Локальные коммиты не в origin:`);
  console.warn(localOnly || '  (нет — но merge-base расходится, проверь вручную)');
  console.warn('  Возможно, параллельная сессия закоммитила в общий локальный branch (CLAUDE.md).');
  console.warn('  Ветвись от origin: node scripts/git-fresh-branch.mjs <name>');
  process.exit(1);
}

if (process.argv[1]?.endsWith('git-check-divergence.mjs')) {
  main();
}
