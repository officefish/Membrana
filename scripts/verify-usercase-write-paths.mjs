#!/usr/bin/env node
/**
 * Static check: manifest embedded paths + branch bundles stay in USERCASE_WRITE_PREFIXES.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { assertUserCaseWritePath, USERCASE_WRITE_PREFIXES } from './lib/usercase-write-guard.mjs';
import { repoRootFromScripts, userCaseDir } from './lib/usercase-paths.mjs';

const repoRoot = repoRootFromScripts();
const scriptsRoot = join(repoRoot, 'docs/device-board-scripts');
let checked = 0;

for (const entry of readdirSync(scriptsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('usercase-')) {
    continue;
  }
  const folderId = entry.name.slice('usercase-'.length);
  const dir = userCaseDir(folderId, repoRoot);
  const manifestPath = join(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (typeof manifest.embeddedDocument === 'string') {
    assertUserCaseWritePath(manifest.embeddedDocument, repoRoot);
    checked += 1;
  }

  for (const meta of Object.values(manifest.branches ?? {})) {
    if (typeof meta.bundleFile === 'string') {
      assertUserCaseWritePath(join(dir, meta.bundleFile), repoRoot);
      checked += 1;
    }
    if (typeof meta.legacyFile === 'string') {
      assertUserCaseWritePath(join('docs/device-board-scripts', meta.legacyFile), repoRoot);
      checked += 1;
    }
  }
}

console.log(`usercase:verify-paths OK (${checked} paths, allowlist: ${USERCASE_WRITE_PREFIXES.join(' | ')})`);
