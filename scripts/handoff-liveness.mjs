#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import {
  evaluateHandoffRows,
  fetchIssuesByNumber,
  parseTop10Rows,
  renderHandoffLivenessReport,
} from './lib/handoff-liveness.mjs';

function parse(argv) {
  const out = {
    handoff: 'docs/HANDOFF.md',
    report: 'docs/audit/tasks/analysis/HANDOFF_LIVENESS.md',
    json: false,
    noReport: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--handoff') out.handoff = argv[(i += 1)];
    else if (a.startsWith('--handoff=')) out.handoff = a.slice('--handoff='.length);
    else if (a === '--report') out.report = argv[(i += 1)];
    else if (a.startsWith('--report=')) out.report = a.slice('--report='.length);
    else if (a === '--json') out.json = true;
    else if (a === '--no-report') out.noReport = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`handoff:liveness: unknown arg ${a}`);
  }
  return out;
}

function usage() {
  console.log(`Usage: node scripts/handoff-liveness.mjs [--report path] [--json] [--no-report]

Checks docs/HANDOFF.md top-10 rows against GitHub Issue states in one GraphQL batch.
Network unavailable => honest unknown, not alive.`);
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
  const md = readFileSync(resolve(repoRoot, args.handoff), 'utf8');
  const parsedRows = parseTop10Rows(md);
  const issueNumbers = [...new Set(parsedRows.flatMap((row) => row.issueNumbers))].sort((a, b) => a - b);
  const issueResult = fetchIssuesByNumber(repoRoot, issueNumbers);
  const rows = evaluateHandoffRows(parsedRows, issueResult);
  const result = { generatedAt: new Date().toISOString(), issueResult, rows };

  if (args.json) {
    console.log(JSON.stringify({
      ...result,
      issueResult: { ...issueResult, issues: Object.fromEntries(issueResult.issues) },
    }, null, 2));
  } else {
    console.log(renderHandoffLivenessReport(result));
  }

  if (!args.noReport) {
    const reportPath = resolve(repoRoot, args.report);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, renderHandoffLivenessReport(result), 'utf8');
    console.error(`[handoff:liveness] report: ${args.report}`);
  }
}

if (process.argv[1]?.endsWith('handoff-liveness.mjs')) main();
