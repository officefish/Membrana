#!/usr/bin/env node
/**
 * yarn membrana-leveling:main-fill — ready → main (pr:ship-поезд).
 *
 * По умолчанию dry-run (план очереди). Реальный ship — --execute + inject через env
 * не делается здесь: передайте ship через программный API runMainFillTrain.
 *
 * @see docs/prompts/MEMBRANA_LEVELING_SCRIPTS_PROMPT.md
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { planMainFill, runMainFillTrain } from './lib/membrana-leveling-main-fill.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseMainFillArgs(argv) {
  /** @type {{ help: boolean, json: boolean, execute: boolean, unitsFile: string | null }} */
  const out = { help: false, json: false, execute: false, unitsFile: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--execute') out.execute = true;
    else if (a === '--units') {
      const next = argv[++i];
      if (!next) throw new Error('--units требует путь к JSON');
      out.unitsFile = next;
    } else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else throw new Error(`лишний аргумент: ${a}`);
  }
  return out;
}

function printUsage() {
  console.log(`Usage: yarn membrana-leveling:main-fill [--units file.json] [--json] [--execute]

  JSON units: [{ "id": "pr-1", "paths": ["a.ts"] }, ...]
  Без --execute — только plan (dry-run). --execute без внешнего shipOne → failed
  (реальный pr:ship — шов оркестратора вечера, не silent merge из CLI).
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string }} [deps]
 * @returns {number}
 */
export function runMainFillCli(argv, deps = {}) {
  const cwd = deps.cwd ?? root;
  let args;
  try {
    args = parseMainFillArgs(argv);
  } catch (err) {
    console.error(`main-fill: ${err instanceof Error ? err.message : err}`);
    printUsage();
    return 2;
  }
  if (args.help) {
    printUsage();
    return 0;
  }

  /** @type {{ id: string, paths?: string[] }[]} */
  let units = [];
  if (args.unitsFile) {
    try {
      units = JSON.parse(readFileSync(join(cwd, args.unitsFile), 'utf8'));
    } catch (err) {
      console.error(`main-fill: ${err instanceof Error ? err.message : err}`);
      return 2;
    }
  }

  const plan = planMainFill(units);
  if (!args.execute) {
    if (args.json) console.log(JSON.stringify({ dryRun: true, ...plan }, null, 2));
    else {
      console.log(`main-fill dry-run: ${plan.queue.length} unit(s)`);
      for (const u of plan.queue) console.log(`  - ${u.id}`);
    }
    return 0;
  }

  const result = runMainFillTrain(units);
  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`main-fill status=${result.status} shipped=${result.shipped.join(',') || '—'}`);
  }
  return result.status === 'failed' ? 1 : 0;
}

export { runMainFillTrain as runMainFill };

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/membrana-leveling-main-fill.mjs')) {
  try {
    process.exitCode = runMainFillCli(process.argv.slice(2));
  } catch (err) {
    console.error(`main-fill: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 2;
  }
}
