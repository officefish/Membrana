import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const libDir = dirname(fileURLToPath(import.meta.url));

/** @returns {string} */
export function repoRootFromScripts() {
  return join(libDir, '..', '..');
}

/**
 * @param {string} folderId kebab without usercase- prefix
 * @param {string} [repoRoot]
 */
export function userCaseDir(folderId, repoRoot = repoRootFromScripts()) {
  return join(repoRoot, 'docs/device-board-scripts', `usercase-${folderId}`);
}

/**
 * @param {string} userCaseId
 * @param {string} [repoRoot]
 */
export function userCaseManifestPath(userCaseId, repoRoot = repoRootFromScripts()) {
  const folderId = normalizeUserCaseFolderId(userCaseId);
  return join(userCaseDir(folderId, repoRoot), 'manifest.json');
}

/**
 * Resolves folder name: accepts `usercase-mvp-microphone` or `mvp-microphone`.
 * @param {string} rawId
 */
export function normalizeUserCaseFolderId(rawId) {
  const trimmed = rawId.trim();
  if (trimmed.startsWith('usercase-')) {
    return trimmed.slice('usercase-'.length);
  }
  return trimmed;
}

/**
 * @param {string} rawId
 * @param {string} [repoRoot]
 */
export function resolveUserCaseDir(rawId, repoRoot = repoRootFromScripts()) {
  const folderId = normalizeUserCaseFolderId(rawId);
  const dir = userCaseDir(folderId, repoRoot);
  if (!existsSync(dir)) {
    throw new Error(`UserCase directory not found: ${dir}`);
  }
  return dir;
}
