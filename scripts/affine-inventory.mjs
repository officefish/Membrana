#!/usr/bin/env node
import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractAffineInventory } from './lib/affine-inventory-extractor.mjs';

function usage() {
  console.log(`Affine read-only source inventory

Usage:
  yarn affine:inventory --input <source.json> --out <new-directory> --git-sha <40-char-sha>

The command reads only explicit local files. It has no production default, network
adapter or .env loading. The output directory must not exist.`);
}

function valueAfter(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1 || !argv[index + 1] || argv[index + 1].startsWith('--')) {
    throw new Error(`${flag}: value required`);
  }
  return argv[index + 1];
}

export function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  const allowed = new Set(['--input', '--out', '--git-sha']);
  for (let index = 0; index < argv.length; index += 2) {
    if (!allowed.has(argv[index])) throw new Error(`unknown option: ${argv[index] ?? '(empty)'}`);
  }
  return {
    help: false,
    inputPath: resolve(valueAfter(argv, '--input')),
    outDir: resolve(valueAfter(argv, '--out')),
    gitSha: valueAfter(argv, '--git-sha'),
  };
}

export function runAffineInventory({ inputPath, outDir, gitSha }) {
  const sealed = extractAffineInventory({ inputPath, gitSha });
  mkdirSync(outDir);
  writeFileSync(resolve(outDir, 'manifest.json'), sealed.manifestText, { encoding: 'utf8', flag: 'wx' });
  writeFileSync(resolve(outDir, 'manifest.sha256'), sealed.sealText, { encoding: 'utf8', flag: 'wx' });
  return {
    ok: true,
    schema: sealed.manifest.schema,
    snapshotId: sealed.manifest.snapshotId,
    counts: sealed.manifest.counts,
    seal: sealed.digest,
    output: outDir,
    liveInv1: 'NOT_PERFORMED',
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  console.log(JSON.stringify(runAffineInventory(args), null, 2));
}

try {
  const invoked = process.argv[1] ? resolve(process.argv[1]) : '';
  if (invoked && realpathSync(invoked) === realpathSync(fileURLToPath(import.meta.url))) main();
} catch (error) {
  console.error(`[affine-inventory] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
