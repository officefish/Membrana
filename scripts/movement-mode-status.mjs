#!/usr/bin/env node
/**
 * Печать / аудит movementMode (К5).
 *
 *   yarn movement:status
 *   yarn movement:status --audit
 *
 * Читает docs/tasks/movement-mode.json (+ default deferred если файла нет).
 * Гейты и task:start обязаны брать режим отсюда — silent-flip запрещён.
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertMovementPrintLegal,
  auditSnapshotRef,
  loadMovementMode,
  MOVEMENT_MODE_RELATIVE,
} from './lib/movement-mode.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cli = {
  audit: process.argv.includes('--audit'),
  help: process.argv.includes('--help') || process.argv.includes('-h'),
};

if (cli.help) {
  console.log(`Usage: node scripts/movement-mode-status.mjs [--audit]
  Prints atomic {movementMode, snapshotRef, switchedAt} from ${MOVEMENT_MODE_RELATIVE}.
  --audit: offline pullOk(snapshotRef) when live.`);
  process.exitCode = 0;
  process.exit();
}

const mode = loadMovementMode(root);
const printCheck = assertMovementPrintLegal(mode, mode.movementMode);
const out = {
  file: MOVEMENT_MODE_RELATIVE,
  movementMode: mode.movementMode,
  snapshotRef: mode.snapshotRef,
  switchedAt: mode.switchedAt,
  switchedBy: mode.switchedBy ?? null,
  printLegal: printCheck,
};

if (cli.audit && mode.movementMode === 'live-snapshot') {
  out.audit = auditSnapshotRef(root, mode);
  if (!out.audit.ok) {
    console.log(JSON.stringify(out, null, 2));
    process.exitCode = 20;
    process.exit();
  }
}

console.log(JSON.stringify(out, null, 2));
if (!printCheck.ok) {
  process.exitCode = printCheck.code;
  process.exit();
}
process.exitCode = 0;
