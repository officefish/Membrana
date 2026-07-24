#!/usr/bin/env node
/**
 * yarn task:validate [cardId] [--json] [--offline]
 *
 * validateTask / validateRegistry (M4B / #1061).
 * Предикат чистый; слепок links собирает грязный слой (offline по умолчанию).
 *
 * Зрение, не забор: находки (включая blocker) НЕ дают ненулевой exit —
 * ритуал сам не останавливается. Exit 2 — только ошибка CLI / нет карточки.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRegistry } from './lib/task-registry.mjs';
import {
  collectRegistryLinksOffline,
  collectTaskLinksOffline,
} from './lib/task-validity-links.mjs';
import {
  formatValidityReport,
  validateRegistry,
  validateTask,
} from './lib/task-validity.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseValidateArgs(argv) {
  /** @type {{ id: string | null, json: boolean, offline: boolean, help: boolean }} */
  const out = { id: null, json: false, offline: true, help: false };
  const positionals = [];
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--offline') out.offline = true;
    else if (a === '--online') out.offline = false;
    else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else positionals.push(a);
  }
  if (positionals.length > 1) {
    throw new Error(`ожидался один cardId или ничего, получено: ${positionals.join(' ')}`);
  }
  out.id = positionals[0] ?? null;
  return out;
}

function printUsage() {
  console.log(`Usage: yarn task:validate [cardId] [--json] [--offline]

  Валидность карточки / реестра (зрение, не забор).
  Без cardId — validateRegistry; с cardId — validateTask.

  Слепок links: offline (default) — fs для prompt/insight/README;
  issue/linear → unknown. --online пока = offline (сеть — follow-up v6).

  Exit: 0 при успешном прогоне (даже с blocker); 2 — ошибка CLI.
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, load?: typeof loadRegistry }} [deps]
 * @returns {number}
 */
export function runTaskValidate(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const load = deps.load ?? loadRegistry;

  let args;
  try {
    args = parseValidateArgs(argv);
  } catch (err) {
    console.error(`task:validate: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }

  if (args.help) {
    printUsage();
    return 0;
  }

  // --online зарезервирован; пока сети нет — честно offline (unknown для GH/Linear).
  if (!args.offline) {
    console.error(
      'task:validate: --online пока собирает тот же offline-слепок (issue/linear=unknown); полный сетевой слой — v6 invariants.',
    );
  }

  const registry = load(cwd);
  const cards = Array.isArray(registry?.tasks) ? registry.tasks : [];

  if (args.id) {
    const card = cards.find((t) => t.id === args.id);
    if (!card) {
      console.error(`task:validate: карточка «${args.id}» не найдена в реестре`);
      return 2;
    }
    const links = collectTaskLinksOffline(card, cwd);
    const verdict = validateTask(card, links);
    if (args.json) {
      console.log(JSON.stringify({ cardId: args.id, links, ...verdict }, null, 2));
    } else {
      console.log(formatValidityReport(verdict, { title: `task:validate ${args.id}` }));
    }
    return 0;
  }

  const links = collectRegistryLinksOffline(cards, cwd);
  const verdict = validateRegistry(cards, links);
  if (args.json) {
    console.log(JSON.stringify({ links: { readmeMatchesRegistry: links.readmeMatchesRegistry }, ...verdict }, null, 2));
  } else {
    console.log(formatValidityReport(verdict, { title: 'task:validate (registry)' }));
    console.log(
      `\nкарточек: ${cards.length}; groupFindings: ${verdict.groupFindings.length}; readmeMatches=${links.readmeMatchesRegistry}`,
    );
  }
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/task-validate.mjs')) {
  process.exitCode = runTaskValidate(process.argv.slice(2));
}
