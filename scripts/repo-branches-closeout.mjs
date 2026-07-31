#!/usr/bin/env node
/**
 * Verify journal completeness and final ref truth without mutating refs.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  renderCloseout,
  validateSalvagePlan,
  verifySalvageCloseout,
} from './lib/branch-salvage-procedure.mjs';
import {
  fetchOrigin,
  loadCurrentRefs,
  loadJson,
  writeText,
} from './lib/branch-salvage-runtime.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function parseCloseoutCli(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] ?? '' : '';
  };
  return {
    plan: value('--plan'),
    journal: value('--journal'),
    report: value('--report'),
    noFetch: argv.includes('--no-fetch'),
    json: argv.includes('--json'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export const CLOSEOUT_HELP = `Usage:
  yarn repo:branches:closeout --plan <plan.json> --journal <journal.json>
    [--no-fetch] [--json] [--report <file>]

Read-only fail-closed verifier. Requires a successful terminal event for every
target, target refs absent, protected refs unchanged, and zero ADR-0020 findings.`;

export function main(argv = process.argv.slice(2)) {
  const cli = parseCloseoutCli(argv);
  if (cli.help) {
    console.log(CLOSEOUT_HELP);
    return;
  }
  if (!cli.plan) throw new Error('--plan <plan.json> is required');
  if (!cli.journal) throw new Error('--journal <journal.json> is required');
  if (!cli.noFetch) fetchOrigin(repoRoot);

  const plan = validateSalvagePlan(loadJson(cli.plan));
  const journal = loadJson(cli.journal);
  const result = verifySalvageCloseout({
    plan,
    journal,
    currentRefs: loadCurrentRefs(repoRoot),
  });
  const text = cli.json
    ? `${JSON.stringify({ planId: plan.id, ...result }, null, 2)}\n`
    : `${renderCloseout(plan, journal, result)}\n`;
  process.stdout.write(text);
  if (cli.report) writeText(cli.report, text);
  if (!result.ok) process.exitCode = 2;
}

if (process.argv[1]?.endsWith('repo-branches-closeout.mjs')) {
  try {
    main();
  } catch (error) {
    console.error(`repo:branches:closeout STOP: ${error.message}`);
    process.exitCode = 2;
  }
}
