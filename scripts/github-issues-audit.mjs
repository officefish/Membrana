#!/usr/bin/env node
/**
 * GitHub Issues Audit — CLI.
 *
 *   yarn issues:audit --manifest docs/issues/manifests/github-issues-audit-YYYY-MM-DD.json
 *   yarn issues:audit:apply --manifest … [--dry-run]
 *
 * @see docs/prompts/GITHUB_ISSUES_AUDIT_PROMPT.md
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyClosures,
  hasGh,
  loadManifest,
  writeReport,
} from './lib/github-issues-audit.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function printHelp() {
  console.log(`GitHub Issues Audit — Membrana

Usage:
  yarn issues:audit --manifest <path> [--report <path>] [--dry-run]
  yarn issues:audit:apply --manifest <path> [--report <path>] [--dry-run]

Options:
  --manifest <path>   JSON manifest (required)
  --report <path>     Output markdown (default: docs/archive/github-issues-audit-<date>.md)
  --dry-run           Preview only; no gh close, no file write
  --help              This help

Process prompt: docs/prompts/GITHUB_ISSUES_AUDIT_PROMPT.md
`);
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const apply = argv.includes('--apply') || process.env.npm_lifecycle_event === 'issues:audit:apply';
  const dryRun = argv.includes('--dry-run');
  const help = argv.includes('--help') || argv.includes('-h');

  let manifest = null;
  let report = null;

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--manifest' && argv[i + 1]) {
      manifest = argv[i + 1];
      i += 1;
    } else if (a.startsWith('--manifest=')) {
      manifest = a.slice('--manifest='.length);
    } else if (a === '--report' && argv[i + 1]) {
      report = argv[i + 1];
      i += 1;
    } else if (a.startsWith('--report=')) {
      report = a.slice('--report='.length);
    }
  }

  return { apply, dryRun, help, manifest, report };
}

const opts = parseArgs(process.argv.slice(2));

if (opts.help) {
  printHelp();
  process.exit(0);
}

if (!opts.manifest) {
  console.error('Error: --manifest <path> is required.');
  printHelp();
  process.exit(1);
}

if (opts.apply && !hasGh()) {
  console.error('Error: gh CLI not found. Install and run `gh auth login`.');
  process.exit(1);
}

const manifestPath = resolve(repoRoot, opts.manifest);
/** @type {import('./lib/github-issues-audit.mjs').AuditManifest} */
const manifest = loadManifest(manifestPath);

const defaultReport = resolve(
  repoRoot,
  `docs/archive/github-issues-audit-${manifest.auditDate}.md`,
);
const reportPath = opts.report ? resolve(repoRoot, opts.report) : defaultReport;

console.log(`Audit date: ${manifest.auditDate}`);
console.log(`Manifest: ${manifestPath}`);
console.log(`Mode: ${opts.apply ? 'apply (comment + close + report)' : 'report only'}`);
if (opts.dryRun) console.log('Dry run: yes');

if (opts.apply) {
  const stats = applyClosures(manifest, true, opts.dryRun);
  console.log(
    `\nClosures: commented=${stats.commented}, closed=${stats.closed}, skipped=${stats.skipped}, errors=${stats.errors}`,
  );
  if (stats.errors > 0) process.exitCode = 1;
}

writeReport(manifest, reportPath, opts.dryRun);

console.log('\nDone.');
