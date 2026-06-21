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
import { normalizeUserCaseFolderId } from './lib/usercase-paths.mjs';

const scriptsDir = dirname(fileURLToPath(import.meta.url));

/** @type {Record<string, string>} */
const BUILDERS = {
  'mvp-microphone': 'build-usercase-mvp-microphone.mjs',
};

function printHelp() {
  console.log(`Usage: yarn usercase:build <usercase-id>

  <usercase-id>  e.g. usercase-mvp-microphone
  Supported: ${Object.keys(BUILDERS)
    .map((id) => `usercase-${id}`)
    .join(', ')}
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
const builder = BUILDERS[folderId];
if (builder === undefined) {
  console.error(`No builder registered for usercase-${folderId}`);
  printHelp();
  process.exit(1);
}

const result = spawnSync(process.execPath, [join(scriptsDir, builder)], {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

try {
  loadUserCaseManifest(rawId);
  console.log(`Manifest validated: usercase-${folderId}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
