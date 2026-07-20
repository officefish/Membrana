#!/usr/bin/env node
/**
 * Явный lift stub → live-snapshot (К5 / M4).
 *
 * Usage:
 *   node scripts/movement-mode-lift.mjs --snapshot <path-to-S.json> [--by <who>] [--execute]
 *
 * По умолчанию dry-run: печатает будущую запись, не пишет.
 * Silent-flip запрещён: этот скрипт — единственный писатель movement-mode.json
 * (не вызывается из capture/producer).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { pullOk, validateSnapshot } from './lib/snapshot-contract.mjs';
import {
  MOVEMENT_MODE_LIVE,
  MOVEMENT_MODE_RELATIVE,
  movementModePath,
} from './lib/movement-mode.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const out = { execute: false, by: 'script:movement-mode-lift', snapshot: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') out.execute = true;
    else if (a === '--snapshot') out.snapshot = argv[++i];
    else if (a === '--by') out.by = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

const cli = parseArgs(process.argv.slice(2));
if (cli.help || !cli.snapshot) {
  console.log(`Usage: node scripts/movement-mode-lift.mjs --snapshot <S.json> [--by who] [--execute]
  Dry-run by default. Requires offline pullOk(S)=true (media-NL honest header).`);
  process.exitCode = cli.help ? 0 : 1;
  process.exit();
}

const snapshotAbs = resolve(root, cli.snapshot);
if (!existsSync(snapshotAbs)) {
  console.error(`snapshot not found: ${snapshotAbs}`);
  process.exitCode = 1;
  process.exit();
}

const snapshot = JSON.parse(readFileSync(snapshotAbs, 'utf8'));
const { ok, problems } = validateSnapshot(snapshot);
if (!ok || !pullOk(snapshot)) {
  console.error('pullOk/validate failed:', problems.join('; ') || 'pullOk=false');
  process.exitCode = 1;
  process.exit();
}

const h = snapshot.header;
if (h.producedBy !== 'media-NL' || h.egressRegion !== 'NL' || h.mode !== 'batch-full-pull') {
  console.error('refuse: not a media-NL batch-full-pull artifact');
  process.exitCode = 1;
  process.exit();
}

// Каноническое место ссылки в git (копия артефакта).
const snapDir = join(root, 'docs/tasks/snapshots');
const snapName = `linear-snapshot-live-ref.json`;
const snapDest = join(snapDir, snapName);
const snapshotRef = `docs/tasks/snapshots/${snapName}`;
const switchedAt = new Date().toISOString();

const record = {
  movementMode: MOVEMENT_MODE_LIVE,
  snapshotRef,
  switchedAt,
  switchedBy: cli.by,
  notes:
    'Explicit K5 lift after first live pullOk (M4). Silent-flip forbidden. Units created before switchedAt keep historical stub.',
  provenance: {
    format: h.format,
    producedBy: h.producedBy,
    egressRegion: h.egressRegion,
    mode: h.mode,
    sourceRevision: h.sourceRevision,
    capturedAt: h.capturedAt,
    recordCount: h.recordCount,
    trigger: h.trigger,
  },
};

console.log(JSON.stringify({ dryRun: !cli.execute, wouldWrite: MOVEMENT_MODE_RELATIVE, record }, null, 2));

if (!cli.execute) {
  console.log('dry-run: pass --execute to write movement-mode.json + snapshot copy');
  process.exitCode = 0;
  process.exit();
}

mkdirSync(snapDir, { recursive: true });
copyFileSync(snapshotAbs, snapDest);
const outPath = movementModePath(root);
writeFileSync(outPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
console.log(
  JSON.stringify({
    written: relative(root, outPath).replace(/\\/g, '/'),
    snapshotRef,
    movementMode: MOVEMENT_MODE_LIVE,
    switchedAt,
  }),
);
