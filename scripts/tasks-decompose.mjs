#!/usr/bin/env node
/**
 * yarn tasks:decompose — декомпозиция активного реестра задач по категориям.
 *
 * Read-only. Категории — в `scripts/tasks-decompose.config.json` (норма Р5:
 * менять конфиг, не код). Обязательный вывод — markdown-таблица; карточки без
 * категории показываются отдельной строкой «ВНЕ КАТЕГОРИЙ», а не прячутся.
 * Скилл: `.cursor/skills/membrana-tasks-decompose/SKILL.md`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { compileCategories, decompose, formatTable } from './lib/tasks-decompose.mjs';
import { listActive, loadRegistry } from './lib/task-registry.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`yarn tasks:decompose

  Раскладывает active-карточки реестра по категориям конфига и печатает таблицу.

  --config <path>   свой конфиг категорий (default scripts/tasks-decompose.config.json)
  --examples <n>    сколько id-примеров в строке таблицы (default 3; 0 — без примеров)
  --full            после таблицы — полный список id по каждой категории
  --json            машинный вывод вместо таблицы

  Категории менять в конфиге, не в коде. «ВНЕ КАТЕГОРИЙ» ≠ ошибка прогона,
  это находка: конфиг отстал от реестра — дополни паттерны.`);
    return;
  }

  const configPath = arg('--config', join(repoRoot, 'scripts', 'tasks-decompose.config.json'));
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const categories = compileCategories(config);

  const active = listActive(loadRegistry());
  const result = decompose(active, categories);

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({
      total: result.total,
      buckets: result.buckets.map((b) => ({ name: b.name, count: b.tasks.length, ids: b.tasks.map((t) => t.id) })),
      unassigned: result.unassigned.map((t) => t.id),
    }, null, 2));
    return;
  }

  console.log(`tasks:decompose — active: ${result.total}, категорий: ${categories.length}\n`);
  // NaN-гард (ревью 21.07): `--examples abc` иначе тихо гасил бы примеры.
  const examplesRaw = Number(arg('--examples', '3'));
  console.log(formatTable(result, { examples: Number.isFinite(examplesRaw) ? examplesRaw : 3 }));

  if (process.argv.includes('--full')) {
    for (const b of result.buckets) {
      console.log(`\n## ${b.name} (${b.tasks.length})`);
      for (const t of b.tasks) console.log(`  • ${t.id}${t.size ? ` [${t.size}]` : ''} — ${t.title ?? ''}`);
    }
  }

  if (result.unassigned.length > 0) {
    console.log(`\n⚠ вне категорий (${result.unassigned.length}) — дополни конфиг:`);
    for (const t of result.unassigned) console.log(`  • ${t.id} — ${t.title ?? ''}`);
  }
}

main();
