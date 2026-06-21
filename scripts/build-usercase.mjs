#!/usr/bin/env node
/**
 * Builds a bundled UserCase by id (dispatches to id-specific builders).
 *
 * Usage: yarn usercase:build <id>
 * Example: yarn usercase:build usercase-mvp-microphone
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadUserCaseManifest } from './lib/usercase-manifest.mjs';
import { finalizeUserCaseBuild } from './lib/usercase-post-build.mjs';
import { normalizeUserCaseFolderId } from './lib/usercase-paths.mjs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, string>} */
const BUILDERS = {
  'mvp-microphone': 'build-usercase-mvp-microphone.mjs',
  'mvp-microphone-alpha': 'build-usercase-competition-team.mjs alpha',
  'mvp-microphone-beta': 'build-usercase-competition-team.mjs beta',
  'mvp-microphone-gamma': 'build-usercase-competition-team.mjs gamma',
};

function printHelp() {
  console.log(`Usage: yarn usercase:build <usercase-id>

  <usercase-id>  e.g. usercase-mvp-microphone
  Supported: ${Object.keys(BUILDERS)
    .map((id) => `usercase-${id}`)
    .join(', ')}

  All competition forks: yarn usercase:build-competition-all
  Agent CLI:             node scripts/usercase.mjs help
  Generation prompt:     docs/prompts/DEVICE_BOARD_USERCASE_GENERATION_PROMPT.md
`);
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  printHelp();
  process.exit(args.length === 0 ? 1 : 0);
}

const rawId = args.find((arg) => !arg.startsWith('--'));
if (rawId === undefined) {
  console.error('Missing <usercase-id>');
  process.exit(1);
}

const folderId = normalizeUserCaseFolderId(rawId);
const builderEntry = BUILDERS[folderId];
if (builderEntry === undefined) {
  console.error(`No builder registered for usercase-${folderId}`);
  printHelp();
  process.exit(1);
}

const builderParts = builderEntry.split(' ');
const builderScript = builderParts[0];
const builderArg = builderParts[1];

const spawnArgs = [join(scriptsDir, builderScript)];
if (builderArg !== undefined) {
  spawnArgs.push(builderArg);
}

const result = spawnSync(process.execPath, spawnArgs, {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

try {
  if (!builderEntry.includes('competition-team')) {
    await finalizeUserCaseBuild(rawId);
  }
  loadUserCaseManifest(rawId);
  console.log(`Manifest validated: usercase-${folderId}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
