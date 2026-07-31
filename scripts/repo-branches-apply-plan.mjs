#!/usr/bin/env node
/**
 * Execute or recover exactly one ref from a ratified salvage plan.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createSalvageJournal,
  renderExecutionJournal,
  runOneRef,
  selectPlanTarget,
  validateSalvageJournal,
  validateSalvagePlan,
} from './lib/branch-salvage-procedure.mjs';
import {
  deleteRef,
  fetchOrigin,
  heldBranches,
  loadCurrentRefs,
  loadJson,
  snapshotLiveTrees,
  writeJsonAtomic,
  writeText,
} from './lib/branch-salvage-runtime.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function parseApplyPlanCli(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] ?? '' : '';
  };
  return {
    plan: value('--plan'),
    journal: value('--journal'),
    report: value('--report'),
    targetRef: value('--target'),
    next: argv.includes('--next'),
    execute: argv.includes('--execute'),
    noFetch: argv.includes('--no-fetch'),
    json: argv.includes('--json'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export const APPLY_PLAN_HELP = `Usage:
  yarn repo:branches:apply-plan --plan <plan.json> --journal <journal.json>
    (--target <full-ref> | --next) [--report <file>] [--execute]
    [--no-fetch] [--json]

Dry-run by default. --execute requires:
  - ownerGate.status=ratified
  - --report <file>
  - one exact target only (no batch path)

The journal is written atomically with a prepared event before mutation. A later
run recovers a ref that disappeared after prepared but before terminal post-check.`;

export async function main(argv = process.argv.slice(2)) {
  const cli = parseApplyPlanCli(argv);
  if (cli.help) {
    console.log(APPLY_PLAN_HELP);
    return;
  }
  if (!cli.plan) throw new Error('--plan <plan.json> is required');
  if (!cli.journal) throw new Error('--journal <journal.json> is required');
  if (cli.execute && !cli.report) throw new Error('--execute requires --report <file>');

  const plan = validateSalvagePlan(loadJson(cli.plan));
  let journal = existsSync(resolve(cli.journal))
    ? loadJson(cli.journal)
    : createSalvageJournal(plan);
  validateSalvageJournal(plan, journal);
  const target = selectPlanTarget(plan, journal, {
    targetRef: cli.targetRef,
    next: cli.next,
  });

  if (!cli.noFetch) fetchOrigin(repoRoot);
  const saveJournal = async (nextJournal) => {
    writeJsonAtomic(cli.journal, nextJournal);
    if (cli.report) writeText(cli.report, renderExecutionJournal(plan, nextJournal));
    journal = nextJournal;
  };
  const io = {
    loadRefs: async () => loadCurrentRefs(repoRoot),
    heldBranches: async () => heldBranches(repoRoot),
    snapshotLiveTrees: async () => snapshotLiveTrees(repoRoot),
    deleteRef: async (item) => deleteRef(item, repoRoot),
    saveJournal,
  };

  const result = await runOneRef({
    plan,
    journal,
    target,
    execute: cli.execute,
    io,
  });
  const payload = {
    planId: plan.id,
    planHash: result.journal.planHash,
    selectedRef: target?.ref ?? null,
    outcome: result.outcome,
  };
  if (cli.json) console.log(JSON.stringify(payload, null, 2));
  else {
    console.log(
      `branch salvage ${cli.execute ? 'execute' : 'dry-run'}: ` +
        `${target?.ref ?? 'all targets complete'} -> ${result.outcome.status}`,
    );
    if (!cli.execute) console.log('dry-run: refs/journal/report were not changed');
    else console.log(`journal: ${cli.journal}\nreport: ${cli.report}`);
  }
  if (result.outcome.status === 'postcheck-failed') process.exitCode = 2;
}

if (process.argv[1]?.endsWith('repo-branches-apply-plan.mjs')) {
  main().catch((error) => {
    console.error(`repo:branches:apply-plan STOP: ${error.message}`);
    process.exitCode = 2;
  });
}
