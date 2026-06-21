import { relative, resolve } from 'node:path';

/** Relative repo paths that UserCase build/verify may write (NB3 hygiene). */
export const USERCASE_WRITE_PREFIXES = [
  'docs/device-board-scripts/usercase-',
  'docs/device-board-scripts/device-scenario-',
  'packages/device-board/src/graph/default-usercase-',
];

/**
 * @param {string} absoluteOrRelative path under repo root
 * @param {string} repoRoot
 */
export function assertUserCaseWritePath(absoluteOrRelative, repoRoot) {
  const abs = resolve(repoRoot, absoluteOrRelative);
  const rel = relative(repoRoot, abs).replace(/\\/g, '/');
  const allowed = USERCASE_WRITE_PREFIXES.some((prefix) => rel.startsWith(prefix));
  if (!allowed) {
    throw new Error(
      `UserCase write path outside allowlist: ${rel}\nAllowed prefixes: ${USERCASE_WRITE_PREFIXES.join(', ')}`,
    );
  }
  return rel;
}
