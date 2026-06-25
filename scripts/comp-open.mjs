#!/usr/bin/env node
/**
 * Open a Competition Sprint: validate brief, print branch commands, optional ACTIVE refresh.
 *
 * Usage: yarn comp:open --id comp-mvp-async-v2-2026-06-25
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TEAMS = ['alpha', 'beta', 'gamma'];

const args = process.argv.slice(2);
const idIdx = args.indexOf('--id');
const sprintId = idIdx >= 0 ? args[idIdx + 1] : undefined;
const force = args.includes('--force');

if (!sprintId) {
  console.error('Usage: yarn comp:open --id <sprint-id> [--force]');
  process.exit(1);
}

const briefPath = join(root, 'docs/competition-sprint', sprintId, 'COMPETITION_SPRINT_BRIEF.md');
const activePath = join(root, 'docs/COMPETITION_SPRINT_ACTIVE.md');

if (!existsSync(briefPath)) {
  console.error(`Brief not found: ${briefPath}`);
  process.exit(1);
}

const active = existsSync(activePath) ? readFileSync(activePath, 'utf8') : '';
if (active.includes('status** | `open`') && !force) {
  console.error('COMPETITION_SPRINT_ACTIVE.md already open. Use --force to continue.');
  process.exit(1);
}

const baseSha = execSync('git rev-parse --short HEAD', { cwd: root, encoding: 'utf8' }).trim();

console.log(`\nCompetition Sprint OPEN: ${sprintId}`);
console.log(`Brief: ${briefPath}`);
console.log(`BASE_SHA: ${baseSha}`);
console.log(`\nCreate team branches from current HEAD:\n`);

for (const team of TEAMS) {
  const branch = `comp/${sprintId}/${team}`;
  console.log(`  git checkout -b ${branch}`);
  console.log(`  git push -u origin ${branch}`);
  console.log(`  git checkout main\n`);
}

console.log('Phase 1: each team updates team-*/CONCEPT.md and appends PITCH_LOG.md');
console.log('See docs/COMPETITION_SPRINT_REGULATION.md § Phase 1\n');
