#!/usr/bin/env node
/**
 * yarn task:inspect <cardId> [--depth=1|2] [--json]
 *
 * inspectElement для карточки реестра задач (M4A / #1060).
 * Читает только docs/tasks/registry.json — в сеть не ходит.
 * `--refresh` здесь запрещён: живые данные — отдельная команда/флаг вне inspect.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRegistry } from './lib/task-registry.mjs';
import {
  formatInspection,
  formatInspectionWarnings,
  inspectElement,
  normalizeDepth,
} from './lib/task-inspect.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseInspectArgs(argv) {
  /** @type {{ id: string | null, depth: unknown, json: boolean, refresh: boolean, help: boolean }} */
  const out = { id: null, depth: 2, json: false, refresh: false, help: false };
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') {
      out.help = true;
    } else if (a === '--json') {
      out.json = true;
    } else if (a === '--refresh') {
      out.refresh = true;
    } else if (a === '--depth') {
      out.depth = argv[++i];
    } else if (a.startsWith('--depth=')) {
      out.depth = a.slice('--depth='.length);
    } else if (a.startsWith('-')) {
      throw new Error(`неизвестный флаг: ${a}`);
    } else {
      positionals.push(a);
    }
  }
  if (positionals.length > 1) {
    throw new Error(`ожидался один cardId, получено: ${positionals.join(' ')}`);
  }
  out.id = positionals[0] ?? null;
  return out;
}

function printUsage() {
  console.log(`Usage: yarn task:inspect <cardId> [--depth=1|2] [--json]

  Паспорт карточки из docs/tasks/registry.json (без сети).
  Рекурсия только по живым (active) дочерним; depth default=2.

  --refresh не поддерживается: это отдельная команда/флаг вне inspect.
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, load?: typeof loadRegistry }} [deps]
 * @returns {number} exit code
 */
export function runTaskInspect(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const load = deps.load ?? loadRegistry;

  let args;
  try {
    args = parseInspectArgs(argv);
  } catch (err) {
    console.error(`task:inspect: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }

  if (args.help) {
    printUsage();
    return 0;
  }

  if (args.refresh) {
    console.error(
      'task:inspect: --refresh запрещён внутри inspect. Живые данные Linear/GitHub — отдельная команда/флаг (не v4 inspect).',
    );
    return 2;
  }

  if (!args.id) {
    console.error('task:inspect: нужен <cardId>');
    printUsage();
    return 2;
  }

  let depth;
  try {
    depth = normalizeDepth(args.depth);
  } catch (err) {
    console.error(`task:inspect: ${err instanceof Error ? err.message : err}`);
    return 2;
  }

  const registry = load(cwd);
  const inspection = inspectElement(registry, args.id, { depth });
  if (!inspection) {
    console.error(`task:inspect: карточка «${args.id}» не найдена в реестре`);
    return 2;
  }

  if (args.json) {
    console.log(JSON.stringify(inspection, null, 2));
  } else {
    console.log(`task:inspect ${args.id} (depth=${depth})\n`);
    console.log(formatInspection(inspection));
  }

  const warnings = formatInspectionWarnings(inspection);
  for (const w of warnings) console.error(w);

  return inspection.hasInconsistency ? 1 : 0;
}

// Не матчить `task-inspect.test.mjs` через endsWith('task-inspect.mjs').
const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/task-inspect.mjs')) {
  process.exitCode = runTaskInspect(process.argv.slice(2));
}
