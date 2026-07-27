#!/usr/bin/env node
/**
 * yarn handoff:claim — отметить занятость в docs/HANDOFF.md одной командой.
 *
 *   yarn handoff:claim --row 4 --by "агент А, дерево Membrana-delivery"
 *   yarn handoff:claim --note "блок Х — агент А (issue #NNNN)"
 *   [--handoff docs/HANDOFF.md] [--dry-run]
 *
 * Пара-писатель к читателю tasks:handoff-liveness. Чужую заявку не перетирает —
 * отказ называет держателя. Exit: 0 — записано/dry; 1 — отказ; 2 — usage/ФС.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { claimNote, claimRow } from './lib/handoff-claim.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const o = { row: null, by: null, note: null, handoff: 'docs/HANDOFF.md', dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--row') o.row = argv[(i += 1)];
    else if (a === '--by') o.by = argv[(i += 1)];
    else if (a === '--note') o.note = argv[(i += 1)];
    else if (a === '--handoff') o.handoff = argv[(i += 1)];
    else if (a === '--dry-run') o.dryRun = true;
    else {
      console.error(`handoff:claim — неизвестный аргумент «${a}»`);
      return null;
    }
  }
  return o;
}

function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o) return 2;
  if (!((o.row && o.by) || o.note)) {
    console.error('Usage: yarn handoff:claim --row N --by "кто" | --note "текст" [--handoff <путь>] [--dry-run]');
    return 2;
  }
  const path = join(repoRoot, o.handoff);
  let md;
  try {
    md = readFileSync(path, 'utf8');
  } catch (e) {
    console.error(`handoff:claim — не читается ${o.handoff}: ${e.message}`);
    return 2;
  }
  const r = o.row ? claimRow(md, o.row, o.by) : claimNote(md, o.note);
  if (r.error) {
    console.error(`handoff:claim — отказ: ${r.error}`);
    return 1;
  }
  if (o.dryRun) {
    console.log(`handoff:claim [DRY-RUN] — ${o.row ? `строка ${o.row} → «${o.by}»` : 'блок занятости добавлен'} (файл не тронут)`);
    return 0;
  }
  writeFileSync(path, r.md, 'utf8');
  console.log(`handoff:claim — записано в ${o.handoff}: ${o.row ? `строка ${o.row} занята («${o.by}»)` : 'блок занятости перед «Ниже черты»'}. Коммить файл поимённо со своим PR.`);
  return 0;
}

if (process.argv[1]?.endsWith('handoff-claim.mjs')) process.exit(main());
