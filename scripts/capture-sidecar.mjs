#!/usr/bin/env node
import { resolve } from 'node:path';
import { checkCaptureSidecarFile } from './lib/capture-sidecar.mjs';

export function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== '--check' || !argv[1]) {
    throw new Error('Usage: yarn capture:sidecar --check <file>');
  }
  return { check: argv[1] };
}

export function main(argv) {
  let args;
  try { args = parseArgs(argv); }
  catch (error) { console.error(`capture:sidecar — ${error.message}`); return 2; }

  const path = resolve(process.cwd(), args.check);
  const findings = checkCaptureSidecarFile(path);
  if (findings.length > 0) {
    console.error(`capture:sidecar — ОТКАЗ: ${findings.length}`);
    for (const item of findings) console.error(`  ✖ [${item.code}] ${item.path} — ${item.message}`);
    return 1;
  }
  console.log(`capture:sidecar — OK: ${path}`);
  return 0;
}

const entry = (process.argv[1] ?? '').replace(/\\/gu, '/');
if (entry.endsWith('/capture-sidecar.mjs')) process.exitCode = main(process.argv.slice(2));
