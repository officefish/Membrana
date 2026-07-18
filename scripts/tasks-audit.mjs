#!/usr/bin/env node
/**
 * yarn tasks:audit — аудит реестра: что из `active` закрыто на самом деле.
 *
 * Read-only ВСЕГДА: аудит только предлагает, массовая архивация — слово владельца.
 * Спека: `docs/prompts/REGISTRY_AUDIT_PROMPT.md`. Применение — `yarn task:archive <id>`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { auditRegistry, issuesFromRegistry, registryDefects } from './lib/tasks-audit.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Состояния иссью из gh одним запросом. */
function fetchIssues() {
  const raw = execFileSync(
    'gh',
    ['issue', 'list', '--state', 'all', '--limit', '600', '--json', 'number,state,stateReason,title'],
    { encoding: 'utf8', cwd: repoRoot },
  );
  return new Map(JSON.parse(raw).map((i) => [i.number, i]));
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`yarn tasks:audit

  Аудит реестра задач: три корзины (архивировать / отменено / разобрать руками).
  Read-only. Требует gh (право на сеть — это registry-reaper, не вечерний аудитор).

  --offline   считать по полю githubIssueClosedAt из реестра, без сети (#620).
              Воспроизводимо по коммиту; актуальность — за yarn tasks:sync-issues.

  Спека процесса: docs/prompts/REGISTRY_AUDIT_PROMPT.md`);
    return;
  }

  const reg = JSON.parse(readFileSync(join(repoRoot, 'docs/tasks/registry.json'), 'utf8'));
  const offline = process.argv.includes('--offline');
  let issues;
  if (offline) {
    // #620 / DA1: вход целиком из коммита, поэтому результат воспроизводим бит-в-бит.
    // Цена — данные настолько свежи, насколько свеж последний tasks:sync-issues; это
    // честный размен, и он назван вслух, а не спрятан.
    issues = issuesFromRegistry(reg.tasks);
    console.log(`[offline] состояние иссью из реестра: ${issues.size} закрытых\n`);
  } else {
    try {
      issues = fetchIssues();
    } catch (e) {
      console.error(`gh недоступен — аудит невозможен: ${e.message.split('\n')[0]}`);
      console.error('Это не «всё чисто»: без сети состояние закрытия неизвестно.');
      console.error('Если поле синхронизировано — повторите с --offline.');
      process.exitCode = 1;
      return;
    }
  }

  const { archive, cancelled, manual, umbrellas } = auditRegistry(reg.tasks, issues);
  const active = reg.tasks.filter((t) => t.status === 'active').length;

  console.log(`tasks:audit — active: ${active}, кандидатов: ${archive.length + cancelled.length + manual.length}\n`);

  const bucket = (title, items) => {
    console.log(`## ${title}: ${items.length}`);
    for (const i of items) console.log(`  - ${i.id} (#${i.githubIssue}) — ${i.reason}`);
    console.log('');
  };

  bucket('АРХИВИРОВАТЬ (одиночная иссью, COMPLETED)', archive);
  bucket('ОТМЕНЕНО (NOT_PLANNED — archiveNotes обязаны это сказать)', cancelled);
  bucket('РАЗОБРАТЬ РУКАМИ (зонтик — вердикт по каждой)', manual);

  if (umbrellas.size > 0) {
    console.log(`Зонтичных иссью: ${umbrellas.size}`);
    for (const [n, cards] of umbrellas) {
      console.log(`  #${n} → ${cards.length}: ${cards.map((c) => c.id).join(', ')}`);
    }
    console.log('');
  }

  const defects = registryDefects(reg.tasks);
  if (defects.length > 0) {
    console.log('Систематические дефекты (чинить отдельно, не в аудите):');
    for (const d of defects) console.log(`  ⚠ ${d}`);
    console.log('');
  }

  console.log(
    'Применение: yarn task:archive <id>. НИКОГДА не архивировать пакетом по механическому\n' +
      'признаку — «иссью закрыта» это гипотеза, а не вердикт (живой прогон 18.07: зонтик\n' +
      '#47 накрыл 5 карточек, среди них незакрытая vdr-hard-gate).',
  );
}

// Гард запуска: без него импорт из теста полез бы в gh.
if (process.argv[1]?.endsWith('tasks-audit.mjs')) main();
