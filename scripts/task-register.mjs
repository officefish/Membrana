#!/usr/bin/env node
/**
 * task:register (#469 ti-3): регистрация карточки в docs/tasks/registry.json без
 * ручного JSON и merge-конфликтов. Схема-валидация → детерминированная вставка в
 * начало tasks[] → sync README → insight:drift-чек.
 *
 * Формат registry НЕ меняется (миграция хранилища = insight task-archive-storage).
 * Конфликт параллельных сессий лечится РЕГЕНЕРАЦИЕЙ, не ручным merge: при
 * --push отказе делаем pull --rebase и перестраиваем вставку на свежем реестре
 * (ephemeral regeneration, research Q1 консилиума agent-tooling-friction-2).
 *
 * Usage:
 *   yarn task:register --id <slug> --title "…" --size M [--issue N] [--kind day-sprint]
 *                      [--lead vesnin] [--support a,b] [--insight <id>] [--notes "…"]
 *                      [--prompt docs/prompts/X.md] [--push]
 */
import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildTaskEntry,
  insertTaskAtFront,
  loadRegistry,
  saveRegistry,
  syncTasksReadme,
} from './lib/task-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Разбор `--flag value` / `--flag=value` / `--bool`. Экспорт ради тестов. */
export function parseRegisterArgs(argv) {
  const out = { support: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eq = a.startsWith('--') && a.includes('=') ? a.slice(2).split(/=(.*)/s) : null;
    const key = eq ? eq[0] : a.startsWith('--') ? a.slice(2) : null;
    const val = eq ? eq[1] : argv[i + 1];
    if (!key) continue;
    if (key === 'push') { out.push = true; continue; }
    if (!eq) i++;
    if (key === 'support') out.support = val.split(',').map((s) => s.trim()).filter(Boolean);
    else out[key] = val;
  }
  return out;
}

function sh(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

const isMain = process.argv[1]?.endsWith('task-register.mjs');
if (isMain) {
  const cli = parseRegisterArgs(process.argv.slice(2));
  if (!cli.id || !cli.title || !cli.size) {
    console.error('Usage: yarn task:register --id <slug> --title "…" --size S|M|L [--issue N] [--kind …] [--lead …] [--support a,b] [--insight …] [--notes …] [--prompt …] [--push]');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);

  // Одна попытка: собрать запись, вставить в НАЧАЛО, записать, sync README.
  const applyOnce = () => {
    const registry = loadRegistry(root);
    const entry = buildTaskEntry(cli, today);
    const next = insertTaskAtFront(registry, entry);
    saveRegistry(next, root);
    syncTasksReadme(next, root);
    return entry;
  };

  let entry;
  try {
    entry = applyOnce();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  console.log(`task:register → ${entry.id} (#${entry.githubIssue ?? '—'}, ${entry.size}, ${entry.sprintKind}) вставлена в начало реестра`);

  // insight:drift-чек (если карточка ссылается на инсайт — реестры должны сойтись).
  try {
    sh('node scripts/insight-drift.mjs');
    console.log('insight:drift — OK');
  } catch (e) {
    console.error(`insight:drift предупреждает:\n${e?.stdout ?? e?.message ?? e}`);
  }

  if (!cli.push) {
    console.log('Дальше: закоммить docs/tasks/registry.json + README поимённо (или запусти с --push).');
    process.exit(0);
  }

  // --push: коммит + пуш; при отказе (соседи ушли вперёд) — rebase + РЕГЕНЕРАЦИЯ вставки.
  const commitAndPush = () => {
    sh('git add docs/tasks/registry.json docs/tasks/README.md');
    sh(`git commit -m "chore(tasks): регистрация ${entry.id} (#${entry.githubIssue ?? '—'})"`);
    sh('git push');
  };
  try {
    commitAndPush();
    console.log('Запушено.');
  } catch {
    console.error('Push отклонён — соседи ушли вперёд. Регенерирую вставку на свежем реестре…');
    try {
      sh('git reset --soft HEAD~1'); // снять свой коммит, оставить правки в индексе
      sh('git checkout -- docs/tasks/registry.json docs/tasks/README.md'); // откатить к текущему main-состоянию
      sh('git pull --rebase');
      applyOnce(); // перестроить вставку поверх свежего реестра — ручной merge исключён
      commitAndPush();
      console.log('Регенерировано и запушено поверх свежего реестра.');
    } catch (e2) {
      console.error(`Автоматическая регенерация не удалась: ${e2?.message ?? e2}\nРазреши вручную: git pull --rebase, затем yarn task:register … снова.`);
      process.exit(1);
    }
  }
}
