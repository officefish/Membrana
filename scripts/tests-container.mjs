#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  changedFromGit,
  decomposeTests,
  formatSetupReport,
  inspectTest,
  loadTestCatalog,
  selectTestSetup,
} from './lib/tests-container.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parse(argv) {
  const out = { setup: 'full', list: false, json: false, decompose: false, inspect: null, changed: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--setup') out.setup = argv[(i += 1)];
    else if (a.startsWith('--setup=')) out.setup = a.slice('--setup='.length);
    else if (a === '--changed') out.changed = argv[(i += 1)].split(',').filter(Boolean);
    else if (a.startsWith('--changed=')) out.changed = a.slice('--changed='.length).split(',').filter(Boolean);
    else if (a === '--list') out.list = true;
    else if (a === '--json') out.json = true;
    else if (a === '--decompose') out.decompose = true;
    else if (a === '--inspect') out.inspect = argv[(i += 1)];
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`tests-container: неизвестный аргумент «${a}»`);
  }
  return out;
}

function help() {
  console.log(`Usage:
  node scripts/tests-container.mjs --setup smoke|gate|full [--list|--json]
  node scripts/tests-container.mjs --setup gate --changed scripts/foo.mjs,scripts/foo.test.mjs
  node scripts/tests-container.mjs --decompose
  node scripts/tests-container.mjs --inspect scripts/foo.test.mjs`);
}

function main() {
  let cli;
  try {
    cli = parse(process.argv.slice(2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 2;
    return;
  }
  if (cli.help) {
    help();
    return;
  }

  const catalog = loadTestCatalog(repoRoot);
  if (cli.decompose) {
    const rows = [...decomposeTests(repoRoot, catalog)].sort(([a], [b]) => a.localeCompare(b));
    if (cli.json) console.log(JSON.stringify(Object.fromEntries(rows), null, 2));
    else for (const [group, files] of rows) console.log(`${group}: ${files.length}`);
    return;
  }
  if (cli.inspect) {
    const info = inspectTest(repoRoot, cli.inspect, catalog);
    console.log(JSON.stringify(info, null, 2));
    process.exitCode = info.exists ? 0 : 1;
    return;
  }

  const changedFiles = cli.changed ?? (cli.setup === 'gate' ? changedFromGit(repoRoot) : []);
  const plan = selectTestSetup({ repoRoot, setup: cli.setup, changedFiles, catalog });
  if (cli.json) console.log(JSON.stringify(plan, null, 2));
  else console.error(formatSetupReport(plan));
  if (cli.list) {
    for (const file of plan.run) console.log(file);
    process.exitCode = plan.problems.length ? 1 : 0;
    return;
  }
  if (plan.problems.length) {
    process.exitCode = 1;
    return;
  }
  const run = spawnSync(process.execPath, ['--test', ...plan.run], { cwd: repoRoot, stdio: 'inherit' });
  process.exitCode = run.status ?? 1;
}

if (process.argv[1]?.endsWith('tests-container.mjs')) main();
