#!/usr/bin/env node
/**
 * yarn research <task-id> [--dry-run] — deep research по спринту (#514).
 *
 * Три запроса к Perplexity по секции «Вопросы для research» из промпта задачи;
 * выжимка → docs/tasks/research/<id>.md.
 *
 * Вопросы формулирует АГЕНТ из контекста спринта — только он знает, что здесь
 * неизвестно. `yarn task:register --research` кладёт заготовку секции в промпт.
 *
 * Гарды (оба — из инцидента 2026-07-12, #402): плейсхолдеры <…> и оборванные
 * запросы валят прогон ДО траты рана. Perplexity ответит на что угодно, включая
 * обрывок, — и тогда мусор обнаружится только глазами.
 *
 * Каскад: PERPLEXITY_API_KEY → (нет ключа) печать запросов для MCP/ручного прогона.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadDotEnv } from './_anthropic-env.mjs';
import { runDeepResearch, readTaskPrompt, writeResearch } from './lib/deep-research.mjs';
import { findTask, loadRegistry } from './lib/task-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// PERPLEXITY_API_KEY живёт в корневом .env — сам по себе process.env о нём не знает
// (как и в insight.mjs). Без этого прогон молча уходит в ручной режим.
loadDotEnv();

export function parseResearchCli(argv) {
  return {
    id: argv.find((a) => !a.startsWith('--')),
    dryRun: argv.includes('--dry-run'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

async function main() {
  const cli = parseResearchCli(process.argv.slice(2));
  if (cli.help || !cli.id) {
    console.log(`Usage: yarn research <task-id> [--dry-run]

  Три запроса к Perplexity по секции «Вопросы для research» промпта задачи.
  Выжимка → docs/tasks/research/<task-id>.md

  Заготовку секции кладёт: yarn task:register --id <id> … --research
  Вопросы формулирует агент из контекста — плейсхолдеры <…> валят прогон.`);
    process.exitCode = cli.id ? 0 : 1;
    return;
  }

  const task = findTask(loadRegistry(root), cli.id);
  if (!task) {
    console.error(`Задача не найдена в реестре: ${cli.id}`);
    process.exitCode = 1;
    return;
  }

  const sourceMd = readTaskPrompt(root, task);
  const apiKey = process.env.PERPLEXITY_API_KEY?.trim() || undefined;

  const result = await runDeepResearch({
    sourceMd,
    apiKey,
    dryRun: cli.dryRun,
    title: task.title,
  });

  if (result.mode === 'dry-run') {
    console.log('Dry-run queries:\n');
    for (const q of result.queries) console.log(`[${q.key}] ${q.label}\n${q.query}\n`);
    return;
  }

  if (result.mode === 'manual') {
    console.log('PERPLEXITY_API_KEY не задан — запросы для MCP/ручного прогона:\n');
    for (const q of result.queries) console.log(`[${q.key}] ${q.label}\n${q.query}\n`);
    console.log(`Ответы сложить в docs/tasks/research/${task.id}.md`);
    return;
  }

  const path = writeResearch(root, task.id, result.markdown);
  console.log(`RESEARCH: ${path.slice(root.length + 1).split('\\').join('/')} (${result.queries.length} запроса)`);
  console.log('Выжимка — вход для решения, а не решение: проверяй утверждения по нашему коду.');
}

// Гард запуска: без него импорт из теста полез бы в Perplexity.
if (process.argv[1]?.endsWith('research.mjs')) {
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
