#!/usr/bin/env node
/**
 * yarn verify:wire-sync — сверяет wire-контракт node-realtime между источником
 * (@membrana/core, ESM) и ручной CJS-копией (background-cabinet). Дублирование
 * укусило дважды за 2026-07-08 (событие не доехало / парсер стрипал поля).
 * Сверяем: (1) строковые значения событий NODE_REALTIME_EVENT_TYPES;
 * (2) поля interface BoardScenarioListItem. Расхождение → exit 1.
 *
 * Usage: yarn verify:wire-sync
 */
import { readFileSync } from 'node:fs';

const CORE = 'packages/core/src/contracts/node-realtime/events.ts';
const CORE_TYPES = 'packages/core/src/contracts/node-realtime/capture-events.ts';
const CABINET = 'packages/background-cabinet/src/domain/node-realtime-wire.ts';

/** Все строковые значения событий вида 'word.word[-word]' в исходнике. */
export function extractEventTypeValues(src) {
  const out = new Set();
  const re = /'([a-z][a-z0-9]*\.[a-z][a-z0-9-]*)'/g;
  let m;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return out;
}

/** Имена полей `readonly <name>` внутри `interface <name> { ... }`. */
export function extractInterfaceFields(src, ifaceName) {
  const start = src.indexOf(`interface ${ifaceName}`);
  if (start === -1) return new Set();
  const open = src.indexOf('{', start);
  // Находим парную закрывающую скобку.
  let depth = 0;
  let end = open;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = src.slice(open + 1, end);
  const out = new Set();
  const re = /readonly\s+([A-Za-z0-9_]+)\??\s*:/g;
  let m;
  while ((m = re.exec(body)) !== null) out.add(m[1]);
  return out;
}

/** @returns {{key:string, onlyA:string[], onlyB:string[]}[]} расхождения */
export function wireSyncDiffs(sets) {
  const diffs = [];
  for (const { key, a, b } of sets) {
    const onlyA = [...a].filter((x) => !b.has(x)).sort();
    const onlyB = [...b].filter((x) => !a.has(x)).sort();
    if (onlyA.length || onlyB.length) diffs.push({ key, onlyA, onlyB });
  }
  return diffs;
}

function main() {
  const core = readFileSync(CORE, 'utf8');
  const coreTypes = readFileSync(CORE_TYPES, 'utf8');
  const cabinet = readFileSync(CABINET, 'utf8');

  const sets = [
    {
      key: 'NODE_REALTIME_EVENT_TYPES (значения событий)',
      a: extractEventTypeValues(core),
      b: extractEventTypeValues(cabinet),
    },
    {
      key: 'BoardScenarioListItem (поля)',
      a: extractInterfaceFields(coreTypes, 'BoardScenarioListItem'),
      b: extractInterfaceFields(cabinet, 'BoardScenarioListItem'),
    },
  ];

  const diffs = wireSyncDiffs(sets);
  if (diffs.length === 0) {
    console.log('verify:wire-sync — OK (core ↔ background-cabinet синхронны)');
    return;
  }
  console.error('verify:wire-sync — РАСХОЖДЕНИЕ core ↔ background-cabinet:');
  for (const d of diffs) {
    console.error(`  [${d.key}]`);
    if (d.onlyA.length) console.error(`    только в core: ${d.onlyA.join(', ')}`);
    if (d.onlyB.length) console.error(`    только в cabinet: ${d.onlyB.join(', ')}`);
  }
  console.error('  Синхронизируй packages/background-cabinet/src/domain/node-realtime-wire.ts.');
  process.exit(1);
}

if (process.argv[1]?.endsWith('verify-wire-sync.mjs')) {
  try {
    main();
  } catch (e) {
    console.error(String(e.message ?? e));
    process.exit(1);
  }
}
