#!/usr/bin/env node
/**
 * yarn audit:branch-instructions-pin — PINNED_SUBGRAPH зуб для Mintlify
 * инструкций «ветка → случай» (эпик #823 / F4 #828).
 *
 * Usage:
 *   yarn audit:branch-instructions-pin           # проверить path→SHA
 *   yarn audit:branch-instructions-pin --write   # обновить SHA из working tree
 *   yarn audit:branch-instructions-pin --mode pinned|latest
 */
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MANIFEST_REL,
  auditPin,
  auditSummary,
  formatAuditTable,
  loadManifest,
  refreshManifestShas,
  writeManifest,
} from './lib/branch-instructions-pin.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function resolveMode(argv, manifest) {
  const modeIdx = argv.indexOf('--mode');
  if (modeIdx >= 0) {
    const value = argv[modeIdx + 1];
    if (!value || value.startsWith('--')) {
      console.error('audit:branch-instructions-pin — --mode требует значение latest|pinned');
      process.exitCode = 2;
      return null;
    }
    if (value !== 'latest' && value !== 'pinned') {
      console.error(`audit:branch-instructions-pin — неизвестный mode: ${value}`);
      process.exitCode = 2;
      return null;
    }
    return value;
  }
  const fromManifest = manifest.modeDefault;
  if (fromManifest === 'latest' || fromManifest === 'pinned') return fromManifest;
  return 'latest';
}

function main(argv = process.argv.slice(2)) {
  const write = argv.includes('--write');
  let manifest = loadManifest(root);
  const mode = resolveMode(argv, manifest);
  if (mode == null) return;

  if (write) {
    if (mode === 'pinned') {
      console.error('audit:branch-instructions-pin — --write запрещён в mode=pinned');
      process.exitCode = 2;
      return;
    }
    manifest = refreshManifestShas(manifest, root);
    writeManifest(root, manifest);
    console.log(`audit:branch-instructions-pin — wrote ${MANIFEST_REL}`);
  }

  const rows = auditPin(manifest, root);
  const summary = auditSummary(rows);
  console.log(formatAuditTable(rows));
  console.log(
    `\nsummary: ok=${summary.ok} drift=${summary.drift} missing=${summary.missing} mode=${mode} owner=${manifest.owner}`,
  );

  if (!summary.clean) {
    console.error(
      'audit:branch-instructions-pin — FAIL (обнови пин: yarn audit:branch-instructions-pin --write, отдельным коммитом)',
    );
    process.exitCode = 1;
    return;
  }
  console.log('audit:branch-instructions-pin — OK');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}

export { main };
