#!/usr/bin/env node
/**
 * yarn task:invariants:repair <cardId> (--clear-linear | --manual-linear ID |
 *   --clear-issue | --manual-issue N) [--execute]
 *
 * Интерактивное восстановление мёртвых ссылок (M4C). По умолчанию dry-run.
 * Автовосстановление без явного --execute запрещено (EPIC V6).
 * --link-new не создаёт тикет сам — укажи yarn task:start.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRegistry, saveRegistry } from './lib/task-registry.mjs';
import { planLinkageRepair } from './lib/task-invariants.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseRepairArgs(argv) {
  /** @type {{
   *   id: string | null,
   *   execute: boolean,
   *   help: boolean,
   *   linkNew: boolean,
   *   clearLinear: boolean,
   *   manualLinear: string | null,
   *   clearIssue: boolean,
   *   manualIssue: number | null,
   * }} */
  const out = {
    id: null,
    execute: false,
    help: false,
    linkNew: false,
    clearLinear: false,
    manualLinear: null,
    clearIssue: false,
    manualIssue: null,
  };
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--execute') out.execute = true;
    else if (a === '--dry-run') out.execute = false;
    else if (a === '--link-new') out.linkNew = true;
    else if (a === '--clear-linear') out.clearLinear = true;
    else if (a === '--manual-linear') {
      const next = argv[++i];
      if (!next) throw new Error('--manual-linear требует DRU-id');
      out.manualLinear = next;
    } else if (a === '--clear-issue') out.clearIssue = true;
    else if (a === '--manual-issue') {
      const next = argv[++i];
      if (!next || !Number(next)) throw new Error('--manual-issue требует номер');
      out.manualIssue = Number(next);
    } else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else positionals.push(a);
  }
  if (positionals.length !== 1 && !out.help) {
    throw new Error('нужен ровно один cardId');
  }
  out.id = positionals[0] ?? null;
  return out;
}

function printUsage() {
  console.log(`Usage: yarn task:invariants:repair <cardId> [flags] [--execute]

  --clear-linear          обнулить linearId
  --manual-linear <id>    указать Linear id вручную
  --clear-issue           обнулить githubIssue (+ closedAt)
  --manual-issue <N>      указать номер иссью
  --link-new              не авто: подсказка yarn task:start
  --execute               записать в registry (иначе dry-run)

  Без --execute ничего не пишет.
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, load?: typeof loadRegistry, save?: typeof saveRegistry }} [deps]
 * @returns {number}
 */
export function runInvariantsRepair(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const load = deps.load ?? loadRegistry;
  const save = deps.save ?? saveRegistry;

  let args;
  try {
    args = parseRepairArgs(argv);
  } catch (err) {
    console.error(`task:invariants:repair: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }

  if (args.help) {
    printUsage();
    return 0;
  }

  if (args.linkNew) {
    console.log(
      `task:invariants:repair: --link-new не создаёт тикет автоматически.\n` +
        `Создай twin: yarn task:start --id ${args.id} … (или --manual-linear после создания).`,
    );
    return 0;
  }

  const registry = load(cwd);
  const card = (registry.tasks ?? []).find((t) => t.id === args.id);
  if (!card) {
    console.error(`task:invariants:repair: карточка «${args.id}» не найдена`);
    return 2;
  }

  const plan = planLinkageRepair(card, {
    clearLinear: args.clearLinear,
    manualLinear: args.manualLinear,
    clearIssue: args.clearIssue,
    manualIssue: args.manualIssue,
  });

  if (!plan.ok) {
    console.error(`task:invariants:repair: ${plan.message}`);
    printUsage();
    return 2;
  }

  console.log(`${args.execute ? '' : '[dry-run] '}${plan.message}`);

  if (!args.execute) {
    console.log('Повтор с --execute для записи в docs/tasks/registry.json');
    return 0;
  }

  Object.assign(card, plan.patch);
  save(registry);
  console.log('registry.json обновлён');
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/task-invariants-repair.mjs')) {
  process.exitCode = runInvariantsRepair(process.argv.slice(2));
}
