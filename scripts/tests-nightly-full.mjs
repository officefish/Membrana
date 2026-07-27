#!/usr/bin/env node
import { resolve } from 'node:path';

import {
  renderNightlyFullMarkdown,
  runNightlyFull,
  writeNightlyFullReport,
} from './lib/tests-nightly-full.mjs';

function parse(argv) {
  const out = { dryRun: false, json: false, noWrite: false };
  for (const a of argv) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a === '--json') out.json = true;
    else if (a === '--no-write') out.noWrite = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`tests:nightly-full: unknown arg ${a}`);
  }
  return out;
}

function usage() {
  console.log(`Usage: node scripts/tests-nightly-full.mjs [--dry-run] [--json] [--no-write]

Runs the full tests setup only after kits/tests-master passes pinned audit.
Writes the night-report carrier under tests/reports/nightly-full/latest.{json,md}.`);
}

function main() {
  let args;
  try {
    args = parse(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
    return;
  }
  if (args.help) {
    usage();
    return;
  }
  const repoRoot = resolve('.');
  const report = runNightlyFull({ repoRoot, dryRun: args.dryRun });
  if (!args.noWrite) {
    writeNightlyFullReport(repoRoot, report);
    console.error('[tests:nightly-full] carrier: tests/reports/nightly-full/latest.json');
  }
  if (args.json) console.log(JSON.stringify(report, null, 2));
  else console.log(renderNightlyFullMarkdown(report));
  process.exitCode = report.execution.status === 'fail' || report.execution.status === 'blocked' ? 1 : 0;
}

if (process.argv[1]?.endsWith('tests-nightly-full.mjs')) main();
