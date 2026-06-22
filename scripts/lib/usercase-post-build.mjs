import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  loadEmbeddedDeviceScenarioDocument,
} from './usercase-document.mjs';
import {
  syncUserCaseBranchBundles,
  writeEmbeddedDeviceScenarioDocument,
} from './usercase-embedded-write.mjs';
import { loadUserCaseManifest } from './usercase-manifest.mjs';
import { repoRootFromScripts } from './usercase-paths.mjs';

/**
 * Builds @membrana/device-board and applies layout canon + verify to embedded UserCase.
 * @param {string} rawId
 * @param {string} [repoRoot]
 */
export async function finalizeUserCaseBuild(rawId, repoRoot = repoRootFromScripts()) {
  const yarnCmd = 'yarn';
  const build = spawnSync(yarnCmd, ['workspace', '@membrana/device-board', 'build'], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
  });
  if (build.status !== 0) {
    throw new Error('device-board build failed before layout canon');
  }

  const manifest = loadUserCaseManifest(rawId, repoRoot);
  let document = loadEmbeddedDeviceScenarioDocument(manifest.embeddedDocument, repoRoot);

  const profile = manifest['commentGroupProfile'];
  if (typeof profile === 'string' && profile.length > 0) {
    document = {
      ...document,
      meta: {
        ...(typeof document['meta'] === 'object' && document['meta'] !== null ? document['meta'] : {}),
        commentGroupProfile: profile,
      },
    };
  }

  const canonUrl = pathToFileURL(
    join(repoRoot, 'packages/device-board/dist/graph/usercase-layout-canon.js'),
  ).href;
  const { applyUserCaseLayoutCanon, verifyUserCaseDocumentLayout } = await import(canonUrl);

  document = applyUserCaseLayoutCanon(document);
  const verify = verifyUserCaseDocumentLayout(document);
  if (!verify.ok) {
    for (const issue of verify.errors) {
      console.error(`[${issue.code}] ${issue.path}: ${issue.message}`);
    }
    throw new Error(`usercase:verify-layout FAILED for ${manifest.id}`);
  }

  writeEmbeddedDeviceScenarioDocument(manifest.embeddedDocument, document, repoRoot);
  syncUserCaseBranchBundles(rawId, document, repoRoot);

  console.log(`Layout canon applied: ${manifest.id} (${verify.errors.length} errors)`);
  return document;
}
