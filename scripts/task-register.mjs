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
 *   yarn task:register --id <slug> --title "…" --size M [--issue N] [--linear DRU-N]
 *                      [--kind day-sprint] [--lead vesnin] [--support a,b] [--insight <id>]
 *                      [--notes "…"] [--prompt docs/prompts/X.md] [--research] [--push]
 *
 * Повторный register с тем же --id: дописывает недостающие githubIssue/linearId
 * (anti-duplicate), не создаёт twin-карточку.
 *
 * --research (#514): в промпт кладётся заготовка секции «Вопросы для research».
 * Вопросы формулирует агент из контекста спринта, затем `yarn research <id>`
 * шлёт их в Perplexity. Флаг опт-ин: три рана на «расскажи про X вообще» — не ресёрч.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { researchSectionStub } from './lib/deep-research.mjs';
import {
  buildTaskEntry,
  loadRegistry,
  renderTaskPromptStub,
  saveRegistry,
  syncTasksReadme,
} from './lib/task-registry.mjs';
import { registerOrLinkTask } from './lib/task-start-links.mjs';

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
    if (key === 'research') { out.research = true; continue; }
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
    console.error('Usage: yarn task:register --id <slug> --title "…" --size S|M|L [--issue N] [--kind …] [--lead …] [--support a,b] [--insight …] [--notes …] [--prompt <path>] [--parent-epic <id>] [--push]');
    process.exit(1);
  }

  const today = new Date().toISOString().slice(0, 10);

  // Одна попытка: собрать запись, insert или upsert связей, sync README.
  const applyOnce = () => {
    const registry = loadRegistry(root);
    const entry = buildTaskEntry(cli, today);
    const mode = registry.tasks.some((t) => t.id === entry.id) ? 'upsert-links' : 'insert';
    const result = registerOrLinkTask(registry, entry, mode);
    saveRegistry(result.registry, root);
    syncTasksReadme(result.registry, root);
    return { entry: result.entry, action: result.action };
  };

  let entry;
  let action;
  try {
    ({ entry, action } = applyOnce());
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  const link =
    `GH #${entry.githubIssue ?? '—'} · Linear ${entry.linearId ?? '—'} · ${entry.size} · ${entry.sprintKind}`;
  console.log(
    action === 'upserted-links'
      ? `task:register → ${entry.id} обновлены связи (${link})`
      : `task:register → ${entry.id} (${link}) вставлена в начало реестра`,
  );

  // Заготовка промпта (#476 п.5): карточка несёт promptPath, а файла не было —
  // task:review:run читает его безусловно и closure review падал (2 раза 15.07).
  // Существующий файл не трогаем: там может быть живая постановка.
  const promptAbs = resolve(root, entry.promptPath);
  if (existsSync(promptAbs)) {
    console.log(`Промпт уже есть: ${entry.promptPath}`);
  } else {
    try {
      const template = readFileSync(resolve(root, 'docs/prompts/TASK_PROMPT_TEMPLATE.md'), 'utf8');
      mkdirSync(dirname(promptAbs), { recursive: true });
      // --research (#514): к заготовке промпта добавляется секция вопросов —
      // её заполняет агент из контекста, затем `yarn research <id>` шлёт их.
      const stub = renderTaskPromptStub(template, entry);
      writeFileSync(promptAbs, cli.research ? stub + researchSectionStub(entry) : stub, 'utf8');
      console.log(`Промпт-заготовка: ${entry.promptPath} — ЗАПОЛНИТЬ до кода`);
      if (cli.research) {
        console.log(`Deep research: заполни «Вопросы для research» → yarn research ${entry.id}`);
      }
    } catch (e) {
      // Не роняем регистрацию: карточка уже записана, заготовку можно дописать руками.
      console.error(`Заготовка промпта не создана (${entry.promptPath}): ${e.message}`);
    }
  }

  // insight:drift-чек (если карточка ссылается на инсайт — реестры должны сойтись).
  try {
    sh('node scripts/insight-drift.mjs');
    console.log('insight:drift — OK');
  } catch (e) {
    console.error(`insight:drift предупреждает:\n${e?.stdout ?? e?.message ?? e}`);
  }

  if (!cli.push) {
    // README в карантине (23.07) — регистрация его больше не трогает, коммитить нечего.
    console.log('Дальше: закоммить docs/tasks/registry.json поимённо (или запусти с --push).');
    process.exit(0);
  }

  // --push: коммит + пуш; при отказе (соседи ушли вперёд) — rebase + РЕГЕНЕРАЦИЯ вставки.
  const commitAndPush = () => {
    sh('git add docs/tasks/registry.json');
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
      sh('git checkout -- docs/tasks/registry.json'); // откатить к текущему main-состоянию
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
