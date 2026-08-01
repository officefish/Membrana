#!/usr/bin/env node
/**
 * Read-only reconciliation of a frozen branch inventory against current refs.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assessPlanTargets,
  reconcileInventories,
  renderReconciliation,
  validateSalvagePlan,
} from './lib/branch-salvage-procedure.mjs';
import {
  fetchOrigin,
  heldBranches,
  loadJson,
  writeText,
} from './lib/branch-salvage-runtime.mjs';
import { collectInventory } from './repo-branches.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function parseReconcileCli(argv) {
  const value = (name) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] ?? '' : '';
  };
  return {
    snapshot: value('--snapshot'),
    plan: value('--plan'),
    report: value('--report'),
    noFetch: argv.includes('--no-fetch'),
    json: argv.includes('--json'),
    help: argv.includes('--help') || argv.includes('-h'),
  };
}

export const RECONCILE_HELP = `Usage:
  yarn repo:branches:reconcile --snapshot <inventory.json> [--plan <plan.json>]
    [--no-fetch] [--json] [--report <file>]

Read-only. Compares a frozen yarn repo:branches --json snapshot with current refs.
Reports unchanged / absent / moved / new refs and exact / moved twins.
An optional plan adds exact-tip target readiness; it is never executed here.`;

export function main(argv = process.argv.slice(2)) {
  const cli = parseReconcileCli(argv);
  if (cli.help) {
    console.log(RECONCILE_HELP);
    return;
  }
  if (!cli.snapshot) throw new Error('--snapshot <inventory.json> is required');
  if (!cli.noFetch) fetchOrigin(repoRoot);

  const frozen = loadJson(cli.snapshot);
  const current = collectInventory({ cwd: repoRoot });
  current.fetched = !cli.noFetch;
  const reconciliation = reconcileInventories(frozen, current);

  let planAssessment = [];
  if (cli.plan) {
    const plan = validateSalvagePlan(loadJson(cli.plan));
    const currentRefs = new Map(
      [...(current.local ?? []), ...(current.remote ?? [])].map((row) => [row.ref, row.tip]),
    );
    planAssessment = assessPlanTargets(plan, currentRefs, heldBranches(repoRoot));
  }

  const payload = {
    snapshot: cli.snapshot,
    currentGeneratedAt: current.generatedAt,
    reconciliation,
    planAssessment,
  };
  const text = cli.json
    ? `${JSON.stringify(payload, null, 2)}\n`
    : renderReconciliation({
        reconciliation,
        snapshotPath: cli.snapshot,
        currentGeneratedAt: current.generatedAt,
        planAssessment,
      });
  process.stdout.write(text);
  if (cli.report) writeText(cli.report, text);
}

if (process.argv[1]?.endsWith('repo-branches-reconcile.mjs')) {
  try {
    main();
  } catch (error) {
    console.error(`repo:branches:reconcile STOP: ${error.message}`);
    process.exitCode = 2;
  }
}
