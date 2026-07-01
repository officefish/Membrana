#!/usr/bin/env node
// Guard against a UTF-8 BOM (U+FEFF) sneaking into any tracked package.json.
//
// Why this exists: on Windows some editors/tools re-save package.json as
// "UTF-8 with BOM". A leading BOM makes JSON.parse throw, and PostCSS/Vite
// parse package.json while searching for config — so a BOM in
// apps/client/package.json silently breaks `yarn dev` with an opaque
// "Unexpected token '﻿'" error. `.gitattributes eol=lf` does not strip
// a BOM, so we enforce it here and gate it in CI via `yarn test:scripts`.
//
// Usage:
//   node scripts/check-package-json-bom.mjs          # check, exit 1 if any BOM
//   node scripts/check-package-json-bom.mjs --fix     # strip BOM in place
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const BOM = '﻿';

export function hasBom(content) {
  return content.charCodeAt(0) === 0xfeff;
}

export function stripBom(content) {
  return hasBom(content) ? content.slice(1) : content;
}

/** Tracked package.json files (root + nested), excludes node_modules by construction. */
export function listTrackedPackageJson(cwd = process.cwd()) {
  const out = execFileSync('git', ['ls-files', 'package.json', '**/package.json'], {
    cwd,
    encoding: 'utf8',
  });
  return out
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function findBomFiles(files, cwd = process.cwd()) {
  return files.filter((file) => hasBom(readFileSync(resolve(cwd, file), 'utf8')));
}

function main() {
  const fix = process.argv.includes('--fix');
  const files = listTrackedPackageJson();
  const offenders = findBomFiles(files);

  if (offenders.length === 0) {
    console.log(`OK: ${files.length} package.json без BOM`);
    return;
  }

  if (fix) {
    for (const file of offenders) {
      const stripped = stripBom(readFileSync(resolve(process.cwd(), file), 'utf8'));
      writeFileSync(resolve(process.cwd(), file), stripped, 'utf8');
    }
    console.log(`Исправлено (BOM убран): ${offenders.join(', ')}`);
    return;
  }

  console.error(`BOM найден в ${offenders.length} package.json:`);
  for (const file of offenders) console.error(`  - ${file}`);
  console.error('Запусти `yarn bom:fix`, чтобы убрать BOM.');
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check-package-json-bom.mjs')) {
  main();
}
