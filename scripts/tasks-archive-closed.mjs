#!/usr/bin/env node
/**
 * yarn tasks:archive-closed — находит active-карточки реестра, чьи GitHub-иссью
 * ЗАКРЫТЫ, и предлагает их архивировать (`yarn task:archive <id>`). По умолчанию
 * `--dry-run` (только список). `--execute` — вызвать task:archive для каждой.
 *
 * Usage: yarn tasks:archive-closed [--execute]
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** @returns {object[]} active-карточки, чей githubIssue ∈ closedIssues */
export function cardsToArchive(tasks, closedIssues) {
  const closed = new Set(closedIssues.map(Number));
  return tasks.filter(
    (t) => t.status === 'active' && t.githubIssue != null && closed.has(Number(t.githubIssue)),
  );
}

function main() {
  const execute = process.argv.includes('--execute');
  const reg = JSON.parse(readFileSync('docs/tasks/registry.json', 'utf8'));
  const closedRaw = execFileSync(
    'gh',
    ['issue', 'list', '--state', 'closed', '--limit', '300', '--json', 'number'],
    { encoding: 'utf8' },
  );
  const closed = JSON.parse(closedRaw).map((i) => i.number);
  const cards = cardsToArchive(reg.tasks, closed);

  if (cards.length === 0) {
    console.log('tasks:archive-closed: active-карточек с закрытыми GH-иссью нет.');
    return;
  }
  console.log(`tasks:archive-closed${execute ? '' : ' [DRY-RUN]'}: ${cards.length} кандидат(ов):`);
  for (const c of cards) console.log(`  - ${c.id} (#${c.githubIssue})`);
  if (!execute) {
    console.log('\n(dry-run — добавь --execute, чтобы вызвать `yarn task:archive` для каждой)');
    return;
  }
  for (const c of cards) {
    console.log(`\n→ yarn task:archive ${c.id}`);
    execFileSync('yarn', ['task:archive', c.id], { stdio: 'inherit' });
  }
}

if (process.argv[1]?.endsWith('tasks-archive-closed.mjs')) {
  try {
    main();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
}
