#!/usr/bin/env node
/**
 * Verifies UserCase layout metrics (grid, exec LR, overlap).
 *
 * Usage: yarn usercase:verify-layout <id>
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { loadEmbeddedDeviceScenarioDocument } from './lib/usercase-document.mjs';
import { loadUserCaseManifest } from './lib/usercase-manifest.mjs';
import { repoRootFromScripts } from './lib/usercase-paths.mjs';

function printHelp() {
  console.log(`Usage: yarn usercase:verify-layout <usercase-id>
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

const repoRoot = repoRootFromScripts();

if (process.env.USERCASE_VERIFY_SKIP_BUILD !== '1') {
  const yarnCmd = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
  const build = spawnSync(yarnCmd, ['workspace', '@membrana/device-board', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

try {
  const manifest = loadUserCaseManifest(rawId, repoRoot);
  const document = loadEmbeddedDeviceScenarioDocument(manifest.embeddedDocument, repoRoot);
  const mod = await import(
    pathToFileURL(join(repoRoot, 'packages/device-board/dist/graph/usercase-layout-canon.js')).href
  );
  const result = mod.verifyUserCaseDocumentLayout(document);
  if (!result.ok) {
    console.error(`usercase:verify-layout FAILED for ${manifest.id}`);
    for (const issue of result.errors) {
      console.error(`  [${issue.code}] ${issue.path}: ${issue.message}`);
    }
    for (const issue of result.warnings) {
      console.warn(`  [warn:${issue.code}] ${issue.path}: ${issue.message}`);
    }
    process.exit(1);
  }
  console.log(`usercase:verify-layout OK: ${manifest.id}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
