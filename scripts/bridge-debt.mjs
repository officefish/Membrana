#!/usr/bin/env node
/**
 * yarn bridge:debt — глаголы попугая (M6, контур #1208, #1352).
 *
 *   yarn bridge:debt birth --id <slug> --debt "…" --evidence "…" --origin captain_gesture|lead_gesture|detector|carry [--theme "…"]
 *   yarn bridge:debt repeat --id <slug>
 *   yarn bridge:debt repay --id <slug> --by captain_word | --by fact_ref --fact "<ссылка>"
 *   yarn bridge:debt park --id <slug>
 *   yarn bridge:debt list [--status open|repeated|repaid|parked] [--json]
 *   yarn bridge:debt noise
 *
 * Store: docs/bridge/debt-ledger.jsonl (append-only журнал; источник истины один).
 * DEBTS.md пересобирается производной витриной в легаси-формате после каждой записи.
 * Первый запуск при живом DEBTS.md без журнала — разовая миграция строк в события.
 * Идемпотентные birth/repay; no-op печатается квитанцией, не тишиной.
 *
 * Exit: 0 — сделано/no-op; 1 — отказ (назван словами); 2 — usage/инструментальная.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEBT_STATUSES,
  LEDGER_REL,
  SNAPSHOT_REL,
  appendEvent,
  birthVerb,
  blocksOpen,
  counts,
  foldLedger,
  migrationEvents,
  parkVerb,
  readLedger,
  renderLegacySnapshot,
  repayVerb,
  repeatVerb,
} from './lib/bridge-debt-engine.mjs';
import { parseDebts } from './lib/bridge-debts.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const verb = argv[0];
const flag = (n) => {
  const i = argv.indexOf(`--${n}`);
  return i > -1 && argv[i + 1] != null && !argv[i + 1].startsWith('--') ? argv[i + 1] : null;
};

function ensureMigrated() {
  const ledgerPath = join(repoRoot, LEDGER_REL);
  const snapshotPath = join(repoRoot, SNAPSHOT_REL);
  if (existsSync(ledgerPath) || !existsSync(snapshotPath)) return;
  const rows = parseDebts(readFileSync(snapshotPath, 'utf8'));
  for (const e of migrationEvents(rows, new Date().toISOString())) appendEvent(repoRoot, e);
  console.error(`bridge:debt — разовая миграция: ${rows.length} строк(и) DEBTS.md → журнал ${LEDGER_REL}`);
}

function stateNow() {
  const { events, broken } = readLedger(repoRoot);
  for (const line of broken) console.error(`  ✗ журнал: битая строка ${line} — находка, не молчаливый пропуск`);
  return foldLedger(events);
}

function writeAndRender(event, note) {
  appendEvent(repoRoot, event);
  writeFileSync(join(repoRoot, SNAPSHOT_REL), renderLegacySnapshot(stateNow()), 'utf8');
  console.log(`bridge:debt — ${note}`);
}

function main() {
  const at = new Date().toISOString();
  ensureMigrated();
  const state = stateNow();

  if (verb === 'birth') {
    const { event, note } = birthVerb(state, { id: flag('id'), debt: flag('debt'), evidence: flag('evidence'), theme: flag('theme') ?? '', origin: flag('origin'), at });
    if (!event) {
      console.error(`bridge:debt — ${note}`);
      return note.startsWith('идемпотентно') ? 0 : 1;
    }
    writeAndRender(event, note);
    return 0;
  }
  if (verb === 'repeat' || verb === 'park') {
    const fn = verb === 'repeat' ? repeatVerb : parkVerb;
    const { event, note } = fn(state, { id: flag('id'), at });
    if (!event) {
      console.error(`bridge:debt — ${note}`);
      return note.startsWith('идемпотентно') ? 0 : 1;
    }
    writeAndRender(event, note);
    return 0;
  }
  if (verb === 'repay') {
    const { event, note } = repayVerb(state, { id: flag('id'), provenance: flag('by'), factRef: flag('fact'), at });
    if (!event) {
      console.error(`bridge:debt — ${note}`);
      return note.startsWith('идемпотентно') ? 0 : 1;
    }
    writeAndRender(event, note);
    return 0;
  }
  if (verb === 'list') {
    const filter = flag('status');
    if (filter && !DEBT_STATUSES.includes(filter)) {
      console.error(`bridge:debt — status из (${DEBT_STATUSES.join('|')})`);
      return 2;
    }
    const rows = [...state.values()].filter((d) => !filter || d.status === filter);
    if (argv.includes('--json')) {
      console.log(JSON.stringify({ debts: rows, counts: counts(repoRoot) }));
      return 0;
    }
    for (const d of rows) {
      console.log(`долг #${d.id} · ${d.status} · noise ${d.noiseScore} · repeat×${d.repeatCount}${d.repayProvenance ? ` · repay:${d.repayProvenance}` : ''} — ${d.debt}`);
    }
    const c = counts(repoRoot);
    console.log(`итого: open ${c.open} · repeated ${c.repeated} · repaid ${c.repaid} · parked ${c.parked} · blocks_open ${c.blocksOpen}`);
    return 0;
  }
  if (verb === 'noise') {
    const rows = [...state.values()].filter((d) => d.noiseScore > 0).sort((a, b) => b.noiseScore - a.noiseScore);
    if (rows.length === 0) {
      console.log('bridge:debt noise — тишина честная: повторов нет');
      return 0;
    }
    for (const d of rows) console.log(`шум ${d.noiseScore} · #${d.id} · ${d.status} — ${d.debt}`);
    return 0;
  }
  console.error('Usage: yarn bridge:debt birth|repeat|repay|park|list|noise (см. шапку файла)');
  return 2;
}

if (process.argv[1]?.endsWith('bridge-debt.mjs')) {
  try {
    process.exit(main());
  } catch (e) {
    console.error(`bridge:debt — инструментальная ошибка: ${e.message}`);
    process.exit(2);
  }
}

export { blocksOpen, counts }; // стык с блоком А (#1352): реэкспорт фасада кита
