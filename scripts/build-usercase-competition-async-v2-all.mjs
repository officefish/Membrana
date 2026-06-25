#!/usr/bin/env node
/**
 * Builds all async-v2 competition forks (alpha, beta, gamma).
 *
 * Usage: yarn usercase:build-competition-async-v2-all
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const TEAMS = ['alpha', 'beta', 'gamma'];

const mvpBuild = spawnSync(process.execPath, [join(scriptsDir, 'build-usercase-mvp-microphone.mjs')], {
  stdio: 'inherit',
});
if (mvpBuild.status !== 0) {
  process.exit(mvpBuild.status ?? 1);
}

for (const team of TEAMS) {
  console.log(`\n--- competition async-v2 team: ${team} ---\n`);
  const result = spawnSync(
    process.execPath,
    [join(scriptsDir, 'build-usercase-competition-async-v2-team.mjs'), team],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(
  `\nBuilt async-v2 competition forks: ${TEAMS.map((t) => `usercase-mvp-microphone-${t}-async-v2`).join(', ')}`,
);
