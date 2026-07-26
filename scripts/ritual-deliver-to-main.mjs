#!/usr/bin/env node
/**
 * yarn ritual:deliver-to-main — финальный кадр утра: документы на origin/main.
 *
 * По умолчанию verify-only (exit 2 если не на main). --execute — зарезервирован
 * для pr:ship-провода (owner-gated); пока печатает план.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runDeliverGate, verifyDeliverOnMain } from './lib/ritual-deliver-to-main.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string[]} argv
 */
export function parseDeliverArgs(argv) {
  /** @type {{ help: boolean, json: boolean, execute: boolean, noFetch: boolean }} */
  const out = { help: false, json: false, execute: false, noFetch: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--json') out.json = true;
    else if (a === '--execute') out.execute = true;
    else if (a === '--no-fetch') out.noFetch = true;
    else if (a.startsWith('-')) throw new Error(`неизвестный флаг: ${a}`);
    else throw new Error(`лишний аргумент: ${a}`);
  }
  return out;
}

function gitShowMain(rel) {
  return execFileSync('git', ['show', `origin/main:${rel}`], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
}

function maybeFetch() {
  execFileSync('git', ['fetch', 'origin', 'main'], { cwd: repoRoot, stdio: 'pipe' });
}

function printUsage() {
  console.log(`Usage: yarn ritual:deliver-to-main [--json] [--no-fetch]

  Проверяет STRATEGY_DAY, DAILY_STANDUP, MAIN_DAY_ISSUE на origin/main (факт, не заявление).
  Exit 0 — всё на main; exit 2 — STOP (утро не завершено для соседей).

  --execute — зарезервирован (pr:ship owner-gated); сейчас = verify + план.
  --no-fetch — не вызывать git fetch (тесты/offline).
`);
}

/**
 * @param {string[]} argv
 * @param {{ cwd?: string }} [deps]
 * @returns {number}
 */
export function main(argv = process.argv.slice(2), deps = {}) {
  const root = deps.cwd ?? repoRoot;
  const args = parseDeliverArgs(argv);
  if (args.help) {
    printUsage();
    return 0;
  }
  if (!args.noFetch) {
    try {
      maybeFetch();
    } catch (e) {
      console.error(`ritual:deliver-to-main: fetch origin/main failed: ${e instanceof Error ? e.message : e}`);
      return 2;
    }
  }
  const readRemote = (rel) => {
    try {
      return gitShowMain(rel);
    } catch {
      return null;
    }
  };
  if (args.json) {
    const v = verifyDeliverOnMain(root, { readRemote });
    console.log(JSON.stringify(v, null, 2));
    return v.ok ? 0 : 2;
  }
  if (args.execute) {
    console.warn('ritual:deliver-to-main: --execute → pr:ship через skill/owner; verify-only');
  }
  return runDeliverGate(root, { readRemote });
}

const entry = (process.argv[1] ?? '').replace(/\\/g, '/');
if (entry.endsWith('/ritual-deliver-to-main.mjs')) {
  try {
    process.exitCode = main();
  } catch (err) {
    console.error(`ritual:deliver-to-main: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 2;
  }
}
