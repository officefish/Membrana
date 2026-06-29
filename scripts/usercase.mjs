#!/usr/bin/env node
/**
 * Agent-facing CLI for UserCase build and verification.
 *
 * Usage:
 *   node scripts/usercase.mjs help
 *   node scripts/usercase.mjs build <usercase-id>
 *   node scripts/usercase.mjs build-competition <alpha|beta|gamma|all>
 *   node scripts/usercase.mjs verify-layout <usercase-id>
 *   node scripts/usercase.mjs verify-prerun <usercase-id>
 *   node scripts/usercase.mjs verify-pack <usercase-id>   # layout + prerun
 *   node scripts/usercase.mjs verify-competition          # all sprint forks
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const COMPETITION_IDS = [
  'usercase-mvp-microphone-alpha',
  'usercase-mvp-microphone-beta',
  'usercase-mvp-microphone-gamma',
];

const COMPETITION_ASYNC_V2_IDS = [
  'usercase-mvp-microphone-alpha-async-v2',
  'usercase-mvp-microphone-beta-async-v2',
  'usercase-mvp-microphone-gamma-async-v2',
];

/** @param {string} script @param {string[]} args */
function runScript(script, args = []) {
  const result = spawnSync(process.execPath, [join(scriptsDir, script), ...args], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printHelp() {
  console.log(`UserCase agent CLI

Commands:
  help
  build <usercase-id>              Build embedded document + manifest
  build-competition <team|all>     Pack MVP fork (alpha|beta|gamma|all)
  verify-layout <usercase-id>      Layout canon metrics
  verify-prerun <usercase-id>      Hydrate + validatePreRun
  verify-pack <usercase-id>        layout + prerun
  verify-competition               verify-pack for alpha, beta, gamma (v1 archived)
  verify-competition-async-v2      verify-pack for *-async-v2 forks (active sprint)
  verify-paths                     manifest write paths ⊆ allowlist

Examples:
  node scripts/usercase.mjs build usercase-mvp-microphone
  node scripts/usercase.mjs build-competition beta
  node scripts/usercase.mjs verify-competition

Agent spec: docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md
Lessons:    docs/actions/device-board/USERCASE_COMPETITION_LESSONS.md
CI:         .github/workflows/usercase-competition.yml (set USERCASE_VERIFY_SKIP_BUILD=1 after device-board build)
`);
}

const [command, ...rest] = process.argv.slice(2);

if (command === undefined || command === 'help' || command === '--help' || command === '-h') {
  printHelp();
  process.exit(command === undefined ? 1 : 0);
}

switch (command) {
  case 'build':
    if (rest[0] === undefined) {
      console.error('Missing <usercase-id>');
      process.exit(1);
    }
    runScript('build-usercase.mjs', [rest[0]]);
    break;

  case 'build-competition': {
    const team = rest[0] ?? 'all';
    if (team === 'all') {
      runScript('build-usercase-competition-all.mjs');
    } else if (['alpha', 'beta', 'gamma'].includes(team)) {
      runScript('build-usercase.mjs', [`usercase-mvp-microphone-${team}`]);
    } else {
      console.error('Team must be alpha, beta, gamma, or all');
      process.exit(1);
    }
    break;
  }

  case 'verify-layout':
    if (rest[0] === undefined) {
      console.error('Missing <usercase-id>');
      process.exit(1);
    }
    runScript('verify-usercase-layout.mjs', [rest[0]]);
    break;

  case 'verify-prerun':
    if (rest[0] === undefined) {
      console.error('Missing <usercase-id>');
      process.exit(1);
    }
    runScript('verify-usercase-prerun.mjs', [rest[0]]);
    break;

  case 'verify-pack':
    if (rest[0] === undefined) {
      console.error('Missing <usercase-id>');
      process.exit(1);
    }
    runScript('verify-usercase-layout.mjs', [rest[0]]);
    runScript('verify-usercase-prerun.mjs', [rest[0]]);
    break;

  case 'verify-competition':
    for (const id of COMPETITION_IDS) {
      console.log(`\n--- verify-pack: ${id} ---\n`);
      runScript('verify-usercase-layout.mjs', [id]);
      runScript('verify-usercase-prerun.mjs', [id]);
    }
    break;

  case 'verify-competition-async-v2':
    for (const id of COMPETITION_ASYNC_V2_IDS) {
      console.log(`\n--- verify-pack: ${id} ---\n`);
      runScript('verify-usercase-layout.mjs', [id]);
      runScript('verify-usercase-prerun.mjs', [id]);
    }
    break;

  case 'verify-paths':
    runScript('verify-usercase-write-paths.mjs');
    break;

  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
