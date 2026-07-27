#!/usr/bin/env node
/**
 * yarn case:decompose --by mechanism|repeatable|home — декомпозиция кейсов (#1298).
 * Exit: 0 — разложено; 2 — usage/инструментальная ошибка.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { decomposeBy, listCases } from './lib/case-store.mjs';

const AXES = ['mechanism', 'repeatable', 'home'];
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function main(argv) {
  const i = argv.indexOf('--by');
  const by = i >= 0 ? argv[i + 1] : 'mechanism';
  if (!AXES.includes(by)) {
    console.error(`case:decompose — --by из (${AXES.join('|')})`);
    return 2;
  }
  const cases = listCases(repoRoot);
  const groups = decomposeBy(cases, by);
  console.log(`case:decompose — ${cases.length} кейс(ов) по оси «${by}»:`);
  for (const [key, ids] of groups) {
    console.log(`  ${key} (${ids.length}):`);
    for (const id of ids) console.log(`    · ${id}`);
  }
  return 0;
}

if (process.argv[1]?.endsWith('case-decompose.mjs')) process.exit(main(process.argv.slice(2)));
