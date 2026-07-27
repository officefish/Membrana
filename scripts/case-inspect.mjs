#!/usr/bin/env node
/**
 * yarn case:inspect <id> — паспорт кейса (глагол inspectElement мастерской, #1298).
 * Exit: 0 — найден; 1 — не найден; 2 — инструментальная ошибка.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isLegalNo, listCases } from './lib/case-store.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function fmt(v) {
  if (isLegalNo(v)) return `нет — ${v.none}`;
  if (Array.isArray(v)) return v.join(', ');
  if (v !== null && typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function main(argv) {
  const id = argv.find((a) => !a.startsWith('-'));
  if (!id) {
    console.error('Usage: yarn case:inspect <id>');
    return 2;
  }
  const c = listCases(repoRoot).find((x) => x.id === id);
  if (!c) {
    console.error(`case:inspect — кейс «${id}» не найден в docs/cases/`);
    return 1;
  }
  console.log(`# Паспорт кейса ${c.id}`);
  const m = c.meta ?? {};
  for (const k of ['date', 'home', 'span', 'actors', 'evidence', 'mechanism', 'repeatable', 'cost', 'proofs', 'firmness', 'links']) {
    if (k in m) console.log(`  ${k}: ${fmt(m[k])}`);
  }
  if (c.problems.length > 0) {
    console.log(`  подвал: находок ${c.problems.length}`);
    for (const p of c.problems) console.log(`    ✗ ${p}`);
  } else {
    console.log('  подвал: полон');
  }
  return 0;
}

if (process.argv[1]?.endsWith('case-inspect.mjs')) process.exit(main(process.argv.slice(2)));
