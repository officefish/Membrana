#!/usr/bin/env node
/**
 * yarn task:invariants [cardId] [--fast|--full] [--json] [--snapshot <path>]
 *
 * Инварианты сцепки (M4C / #1062): Linear HARD / Issue WARN / closed→closedAt.
 * Зрение, не забор: exit 0 при нарушениях; 2 — ошибка CLI.
 *
 * --fast (default): кэш TTL 4h; при miss/stale — unchecked + подсказка --full.
 * --full: gh + linear-snapshot@1 → пишет scripts/cache/task-invariants-api.json.
 *
 * Alias: yarn tasks:sync-check
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadRegistry } from './lib/task-registry.mjs';
import {
  checkCardIntegrity,
  checkRegistryIntegrity,
  formatInvariantsReport,
} from './lib/task-invariants.mjs';
import {
  collectInvariantsApiCache,
  resolveFastCache,
  saveInvariantsCache,
} from './lib/task-invariants-links.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseInvariantsArgs(argv) {
  /** @type {{ id: string | null, json: boolean, mode: 'fast' | 'full', help: boolean, snapshot: string | null }} */
  const out = { id: null, json: false, mode: 'fast', help: false, snapshot: null };
  const positionals = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--fast') out.mode = 'fast';
    else if (a === '--full') out.mode = 'full';
    else if (a === '--snapshot') {
      const next = argv[++i];
      if (!next) throw new Error('--snapshot требует путь');
      out.snapshot = next;
    } else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else positionals.push(a);
  }
  if (positionals.length > 1) {
    throw new Error(`ожидался один cardId или ничего, получено: ${positionals.join(' ')}`);
  }
  out.id = positionals[0] ?? null;
  return out;
}

function printUsage() {
  console.log(`Usage: yarn task:invariants [cardId] [--fast|--full] [--json] [--snapshot path]

  Три инварианта сцепки (EPIC V6 / M4C).
  --fast (default): кэш TTL 4h; miss → unchecked, не ходит в сеть.
  --full: GitHub via gh + Linear via linear-snapshot@1; пишет кэш.

  Восстановление мёртвых ссылок — yarn task:invariants:repair (без авто).
  Exit: 0 при любом вердикте; 2 — ошибка CLI.
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string, load?: typeof loadRegistry }} [deps]
 * @returns {number}
 */
export function runTaskInvariants(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  const load = deps.load ?? loadRegistry;

  let args;
  try {
    args = parseInvariantsArgs(argv);
  } catch (err) {
    console.error(`task:invariants: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }

  if (args.help) {
    printUsage();
    return 0;
  }

  const registry = load(cwd);
  const cards = Array.isArray(registry?.tasks) ? registry.tasks : [];

  /** @type {import('./lib/task-invariants.mjs').InvariantsApiCache | null} */
  let apiCache = null;
  /** @type {string | null} */
  let cacheNote = null;

  if (args.mode === 'full') {
    apiCache = collectInvariantsApiCache(cards, cwd, {
      snapshotRel: args.snapshot ?? undefined,
    });
    saveInvariantsCache(cwd, apiCache);
    cacheNote = `full cache written @ ${apiCache.fetchedAt}`;
  } else {
    const resolved = resolveFastCache(cwd);
    if (resolved.reason === 'ok') {
      apiCache = resolved.cache;
      cacheNote = `fast cache hit @ ${apiCache?.fetchedAt}`;
    } else {
      apiCache = null;
      cacheNote =
        resolved.reason === 'cache-stale'
          ? 'cache-stale (TTL 4h) — yarn task:invariants --full'
          : 'cache-miss — yarn task:invariants --full';
    }
  }

  if (args.id) {
    const card = cards.find((t) => t.id === args.id);
    if (!card) {
      console.error(`task:invariants: карточка «${args.id}» не найдена в реестре`);
      return 2;
    }
    const verdict = checkCardIntegrity(card, apiCache);
    if (args.json) {
      console.log(JSON.stringify({ cardId: args.id, mode: args.mode, cacheNote, ...verdict }, null, 2));
    } else {
      console.log(formatInvariantsReport(verdict, { title: `task:invariants ${args.id} (${args.mode})` }));
      if (cacheNote) console.log(`\n${cacheNote}`);
    }
    return 0;
  }

  const verdict = checkRegistryIntegrity(cards, apiCache);
  if (args.json) {
    console.log(JSON.stringify({ mode: args.mode, cacheNote, summary: verdict.summary, violations: verdict.violations }, null, 2));
  } else {
    console.log(formatInvariantsReport(verdict, { title: `task:invariants (${args.mode})` }));
    if (cacheNote) console.log(`\n${cacheNote}`);
  }
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/task-invariants.mjs')) {
  process.exitCode = runTaskInvariants(process.argv.slice(2));
}
