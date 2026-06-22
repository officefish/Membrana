#!/usr/bin/env node
/**
 * Builds all competition sprint forks (alpha, beta, gamma) from MVP base.
 *
 * Usage: yarn usercase:build-competition-all
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const TEAMS = ['alpha', 'beta', 'gamma'];

const mvpBuild = spawnSync(process.execPath, [join(scriptsDir, 'build-usercase.mjs'), 'usercase-mvp-microphone'], {
  stdio: 'inherit',
});
if (mvpBuild.status !== 0) {
  process.exit(mvpBuild.status ?? 1);
}

for (const team of TEAMS) {
  console.log(`\n--- competition team: ${team} ---\n`);
  const result = spawnSync(
    process.execPath,
    [join(scriptsDir, 'build-usercase-competition-team.mjs'), team],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nBuilt competition forks: ${TEAMS.map((t) => `usercase-mvp-microphone-${t}`).join(', ')}`);
